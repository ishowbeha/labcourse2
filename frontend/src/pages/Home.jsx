import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import MatchService from '../services/MatchService';
import FootballService from '../services/FootballService';
import { getFlagEmoji } from '../utils/flags';
import axios from 'axios';
import OrderService from '../services/OrderService';

// Custom hook for responsive styles
const useResponsiveStyles = () => {
  const [screenSize, setScreenSize] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setScreenSize('mobile');
      } else if (width <= 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

const Home = () => {
  const { user, isAdmin, logout } = useAuth();
  const { connected, onlineCount } = useSocket();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const screenSize = useResponsiveStyles();
  const navigate = useNavigate();

  const [showVipModal, setShowVipModal] = useState(false);
  const [vipMatchId, setVipMatchId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [lastOrderNum, setLastOrderNum] = useState('');
  const [error, setError] = useState('');
  const [userOrders, setUserOrders] = useState([]);
  const [allUpcomingMatches, setAllUpcomingMatches] = useState([]);

  // Fetch orders from API and localStorage
  const fetchUserOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/orders', {
        params: { limit: 50 },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      const responseData = response.data;
      if (responseData?.success && responseData?.data?.orders) {
        setUserOrders(responseData.data.orders);
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch orders from API in Home.jsx:', err);
    }
    // Fallback to localStorage
    const localOrders = OrderService.getOrders();
    setUserOrders(localOrders || []);
  };

  useEffect(() => {
    fetchUserOrders();
  }, []);

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  // Determine if the user has already bought a VIP pass this calendar month
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const hasVipThisMonth = userOrders.some(order => {
    const notesStr = order.notes || '';
    const isVipPass = notesStr.includes('VIP Match Experience');
    if (!isVipPass) return false;
    
    const dateStr = order.created_at || order.date || '';
    return dateStr.startsWith(currentYearMonth);
  });

  const getMatchVipPrice = (matchData) => {
    if (!matchData) return 150;
    const basePrice = matchData.basePrice || matchData.base_price || 89;
    const stadium = (matchData.stadiumName || matchData.stadium_name || '').toLowerCase();
    
    // Multipliers based on stadium name
    let multiplier = 1.7; // default fallback
    if (stadium.includes('mercedes-benz')) multiplier = 4.5;
    else if (stadium.includes('gillette')) multiplier = 4.0;
    else if (stadium.includes('at&t')) multiplier = 4.0;
    else if (stadium.includes('nrg')) multiplier = 4.0;
    else if (stadium.includes('arrowhead')) multiplier = 4.0;
    else if (stadium.includes('sofi')) multiplier = 4.5;
    else if (stadium.includes('hard rock')) multiplier = 4.0;
    else if (stadium.includes('metlife')) multiplier = 4.0;
    else if (stadium.includes('lincoln')) multiplier = 4.0;
    else if (stadium.includes('levi')) multiplier = 4.2;
    else if (stadium.includes('lumen')) multiplier = 4.0;
    else if (stadium.includes('akron')) multiplier = 3.5;
    else if (stadium.includes('azteca')) multiplier = 3.5;
    else if (stadium.includes('bbva')) multiplier = 3.5;
    else if (stadium.includes('bc place')) multiplier = 3.5;
    else if (stadium.includes('bmo field')) multiplier = 3.0;
    else if (stadium.includes('national stadium') || stadium.includes('air albania')) multiplier = 3.0;
    else if (stadium.includes('loro')) multiplier = 2.5;
    else if (stadium.includes('selman')) multiplier = 2.0;
    else if (stadium.includes('partizani')) multiplier = 2.5;
    else if (stadium.includes('skënderbeu') || stadium.includes('skenderbeu')) multiplier = 2.0;
    else if (stadium.includes('gjirokastër') || stadium.includes('gjirokaster')) multiplier = 2.0;
    else if (stadium.includes('fadil')) multiplier = 2.5;
    else if (stadium.includes('mitrovica')) multiplier = 1.5;
    else if (stadium.includes('ferizaj')) multiplier = 1.3;
    else if (stadium.includes('peja')) multiplier = 1.3;
    
    const calculated = basePrice * multiplier;
    return Math.min(150, Math.round(calculated * 100) / 100);
  };

  const handleBuyVipExperience = () => {
    // Refresh orders to make sure constraint check is up-to-date
    fetchUserOrders();
    setVipMatchId(allUpcomingMatches[0]?.id || '');
    setPaymentMethod('');
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCvc('');
    setError('');
    setPurchaseSuccess(false);
    setShowVipModal(true);
  };

  const handleConfirmVipPurchase = async () => {
    if (hasVipThisMonth) {
      setError('You have already purchased a VIP Match Experience this calendar month. Limit: 1 per month.');
      return;
    }
    if (!vipMatchId) {
      setError('Please select a match');
      return;
    }
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }
    if (paymentMethod === 'credit-card' && (!cardNumber || !cardName || !cardExpiry || !cardCvc)) {
      setError('Please fill in all card details');
      return;
    }

    setPurchasing(true);
    setError('');

    try {
      const selectedMatch = allUpcomingMatches.find(m => m.id === vipMatchId);
      const matchName = selectedMatch ? `${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}` : 'World Cup Match';
      const stadiumName = selectedMatch ? selectedMatch.stadiumName : 'Host Stadium';

      const originalPrice = selectedMatch ? getMatchVipPrice(selectedMatch) : 150.00;
      const discountAmount = Math.round(originalPrice * 0.28 * 100) / 100;
      const finalPrice = Math.round((originalPrice - discountAmount) * 100) / 100;
      
      const pmName = [
        { id: 'credit-card', name: 'Credit Card' },
        { id: 'paypal', name: 'PayPal' },
        { id: 'bank-transfer', name: 'Bank Transfer' }
      ].find(p => p.id === paymentMethod)?.name || paymentMethod;

      const noteDetails = [
        `VIP Match Experience`,
        `Subtotal: ${originalPrice.toFixed(2)}`,
        `Fees: 0.00`,
        `Discount: ${discountAmount.toFixed(2)}`
      ];
      const notesStr = noteDetails.join(' | ');

      let orderNumber = '';
      let apiPurchaseSucceeded = false;

      // Save order to backend
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/orders/simple-purchase', {
          matchName: `VIP Experience - ${matchName}`,
          sectionName: 'VIP Seating & Lounge',
          quantity: 1,
          totalAmount: finalPrice,
          paymentMethod: paymentMethod,
          notes: notesStr,
          status: 'confirmed'
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        });
        const data = response.data;
        if (data?.success && data?.data?.orderNumber) {
          orderNumber = data.data.orderNumber;
          apiPurchaseSucceeded = true;
        }
      } catch (apiErr) {
        console.warn('Backend simple-purchase failed for VIP experience:', apiErr);
      }

      if (!apiPurchaseSucceeded) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        orderNumber = OrderService.generateOrderNumber();
      }

      // Save order to localStorage
      const order = {
        id: Date.now() + Math.random(),
        orderNumber,
        date: new Date().toISOString().split('T')[0],
        match: `VIP Experience - ${matchName}`,
        matchDate: selectedMatch?.matchDate || new Date().toISOString().split('T')[0],
        matchTime: selectedMatch?.matchTime || '',
        stadium: stadiumName,
        competition: selectedMatch?.competition || 'FIFA World Cup 2026',
        tickets: 1,
        seats: ['VIP Seating & Lounge'],
        subtotal: originalPrice,
        fees: 0,
        discount: discountAmount,
        couponCode: null,
        total: finalPrice,
        status: 'confirmed',
        paymentMethod: pmName,
        notes: notesStr
      };
      OrderService.saveOrder(order);

      // Log activity
      try {
        const token = localStorage.getItem('token');
        await axios.post('/api/logs/activity', {
          action: 'purchase_vip',
          description: `Bought VIP match experience for ${matchName}`,
          resourceType: 'vip_pass',
          resourceId: orderNumber,
          metadata: { match: matchName }
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        });
      } catch (e) {}

      // Refresh orders immediately so hasVipThisMonth is updated
      fetchUserOrders();
      setLastOrderNum(orderNumber);
      setPurchaseSuccess(true);
    } catch (err) {
      console.error('Purchase VIP experience failed:', err);
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const getRealStadium = (homeTeam, stadiumName) => {
    if (stadiumName && stadiumName !== 'To Be Announced' && stadiumName !== 'TBA' && stadiumName !== 'TBD') {
      return stadiumName;
    }
    const h = (homeTeam || '').toLowerCase();
    if (h.includes('canada')) return 'BC Place Stadium';
    if (h.includes('mexico')) return 'Estadio Azteca';
    if (h.includes('argentina') || h.includes('nigeria')) return 'Mercedes-Benz Stadium';
    if (h.includes('germany') || h.includes('japan')) return 'Gillette Stadium';
    if (h.includes('brazil')) return 'AT&T Stadium';
    if (h.includes('france')) return 'NRG Stadium';
    if (h.includes('england')) return 'Arrowhead Stadium';
    if (h.includes('spain')) return 'SoFi Stadium';
    if (h.includes('portugal')) return 'Hard Rock Stadium';
    if (h.includes('netherlands')) return 'MetLife Stadium';
    if (h.includes('belgium')) return 'Lincoln Financial Field';
    if (h.includes('croatia')) return 'Levi\'s Stadium';
    if (h.includes('uruguay')) return 'Lumen Field';
    return 'MetLife Stadium';
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchUpcomingMatches();
  }, []);

  const fetchUpcomingMatches = async () => {
    try {
      // Fetch both local DB matches and API matches
      const [localMatches, apiData] = await Promise.all([
        MatchService.getUpcomingMatches().catch(() => []),
        FootballService.getUpcomingFootballMatches(50).catch(() => [])
      ]);

      // Combine local matches with API matches that are FIFA World Cup 2026
      const allMatches = [];

      // Add local WC matches
      localMatches.forEach(m => {
        if ((m.competition || '').toLowerCase().includes('world cup')) {
          allMatches.push({
            ...m,
            _sortDate: m.matchDate || ''
          });
        }
      });

      // Add API WC matches (avoiding duplicates with local ones)
      const localKeys = new Set();
      localMatches.forEach(m => {
        if ((m.competition || '').toLowerCase().includes('world cup')) {
          localKeys.add(`${m.homeTeam || ''}-${m.awayTeam || ''}`);
        }
      });

      const apiWorldCupMatches = (apiData || []).filter(apiMatch => {
        const compName = apiMatch.league?.name || '';
        return compName === 'World Cup' || compName === 'WC' || compName?.includes('World Cup');
      });

      apiWorldCupMatches.forEach(apiMatch => {
        const key = `${apiMatch.homeTeam?.name}-${apiMatch.awayTeam?.name}`;
        if (!localKeys.has(key)) {
          const matchDate = apiMatch.date ? apiMatch.date.split('T')[0] : null;
          const home = apiMatch.homeTeam?.name || 'Home';
          const venue = getRealStadium(home, apiMatch.venue);
          allMatches.push({
            id: `api-${apiMatch.id}`,
            homeTeam: home,
            awayTeam: apiMatch.awayTeam?.name || 'Away',
            matchDate,
            matchTime: apiMatch.date ? new Date(apiMatch.date).toTimeString().split(' ')[0].slice(0, 5) : null,
            competition: 'FIFA World Cup 2026',
            stadiumName: venue,
            basePrice: 89,
            _sortDate: matchDate || ''
          });
        }
      });

      // Sort by date (closest first), filter out past matches, and take top 4
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

      const upcomingSorted = allMatches
        .filter(m => {
          if (!m._sortDate) return false;
          // Exclude past matches
          // Exclude Brazil vs Serbia match (removed upon request)
          const home = (m.homeTeam || '').toLowerCase();
          const away = (m.awayTeam || '').toLowerCase();
          if ((home.includes('brazil') && away.includes('serbia')) || (home.includes('serbia') && away.includes('brazil'))) {
            return false;
          }
          return m._sortDate > today || (m._sortDate === today && (!m.matchTime || m.matchTime >= currentTime));
        })
        .sort((a, b) => {
          if (!a._sortDate) return 1;
          if (!b._sortDate) return -1;
          return a._sortDate.localeCompare(b._sortDate);
        });

      setAllUpcomingMatches(upcomingSorted);
      setUpcomingMatches(upcomingSorted.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch upcoming matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'TBD' || dateString === 'TBA') return 'To Be Announced';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'To Be Announced';
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const selectedMatch = allUpcomingMatches.find(m => m.id === vipMatchId);
  const currentVipPrice = selectedMatch ? getMatchVipPrice(selectedMatch) : 150;
  const currentDiscount = Math.round(currentVipPrice * 0.28 * 100) / 100;
  const currentTotal = Math.round((currentVipPrice - currentDiscount) * 100) / 100;

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        <div style={styles.welcome}>
          <h1>🏟️ Welcome, {user?.firstName || user?.first_name}!</h1>
          <p style={styles.subtitle}>Stadium Ticket Management System</p>
          {connected && (
            <p style={styles.onlineStatus}>
              <span style={styles.onlineDot}></span>
              {onlineCount} user{onlineCount !== 1 ? 's' : ''} online
            </p>
          )}
        </div>

        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.dashboard : screenSize === 'tablet' ? responsiveStyles.tablet.dashboard : styles.dashboard}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>⚽ Matches</h3>
            <p>Browse upcoming football matches and purchase tickets.</p>
            <a href="/matches" style={styles.cardLink}>View Matches →</a>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🎫 My Tickets</h3>
            <p>View and manage your purchased tickets.</p>
            <a href="/tickets" style={styles.cardLink}>View Tickets →</a>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📋 Orders</h3>
            <p>Check your order history and status.</p>
            <a href="/orders" style={styles.cardLink}>View Orders →</a>
          </div>
        </div>

        {/* Upcoming Featured Matches */}
        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.section : screenSize === 'tablet' ? responsiveStyles.tablet.section : styles.section}>
          <div style={screenSize === 'mobile' ? responsiveStyles.mobile.sectionHeader : styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>🔥 Upcoming Featured Matches</h2>
            <a href="/matches" style={styles.viewAllLink}>View All Matches →</a>
          </div>
          
          {loadingMatches ? (
            <div style={styles.loadingText}>Loading matches...</div>
          ) : upcomingMatches.length > 0 ? (
            <div style={screenSize === 'mobile' ? responsiveStyles.mobile.matchesGrid : screenSize === 'tablet' ? responsiveStyles.tablet.matchesGrid : styles.matchesGrid}>
              {upcomingMatches.map(match => (
                <div key={match.id} style={styles.matchCard}>
                  <div style={styles.matchTeams}>
                    <span style={styles.teamName}>{getFlagEmoji(match.homeTeam)} {match.homeTeam}</span>
                    <span style={styles.vs}>VS</span>
                    <span style={styles.teamName}>{getFlagEmoji(match.awayTeam)} {match.awayTeam}</span>
                  </div>
                  <div style={styles.matchInfo}>
                    <span style={styles.matchDate}>📅 {formatDate(match.matchDate)}</span>
                    <span style={styles.matchCompetition}>🏆 {match.competition || 'FIFA World Cup 2026'}</span>
                  </div>
                  <div style={styles.matchFooter}>
                    <span style={styles.matchStadium}>{getRealStadium(match.homeTeam, match.stadiumName)}</span>
                    <button
                      onClick={() => navigate(`/tickets?matchId=${match.id}`, { state: { match } })}
                      style={styles.buyTicketsBtn}
                    >
                      Get Tickets →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.noMatches}>No upcoming matches available at the moment.</div>
          )}
        </div>

        {/* Special Offers */}
        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.section : screenSize === 'tablet' ? responsiveStyles.tablet.section : styles.section}>
          <h2 style={styles.sectionTitle}>🎁 Special Offers & Promotions</h2>
          <div style={screenSize === 'mobile' ? responsiveStyles.mobile.offersGrid : screenSize === 'tablet' ? responsiveStyles.tablet.offersGrid : styles.offersGrid}>
            {/* Yearly Stadium Pass */}
            <div style={styles.offerCard}>
              <div style={styles.offerBadge}>BEST VALUE</div>
              <div style={styles.offerHeader}>
                <span style={styles.offerIcon}>🏟️</span>
                <h3 style={styles.offerTitle}>Season Stadium Pass</h3>
              </div>
              <p style={styles.offerDescription}>
                Get unlimited access to all matches at your favorite stadium for an entire year! 
                Perfect for die-hard fans who never want to miss a game.
              </p>
              <div style={styles.offerPricing}>
                <span style={styles.offerOriginalPrice}>€299.99</span>
                <span style={styles.offerCurrentPrice}>€199.99/year</span>
                <span style={styles.offerDiscount}>Save 33%</span>
              </div>
              <div style={styles.offerFeatures}>
                <div style={styles.offerFeature}>✓ Access to ALL home matches</div>
                <div style={styles.offerFeature}>✓ Priority seat selection</div>
                <div style={styles.offerFeature}>✓ 10% off merchandise</div>
                <div style={styles.offerFeature}>✓ Exclusive fan events</div>
              </div>
              <button onClick={() => navigate('/stadiums')} style={styles.offerBtn}>
                Choose Your Stadium →
              </button>
            </div>

            {/* Family Package */}
            <div style={styles.offerCard}>
              <div style={styles.offerBadgeSecondary}>POPULAR</div>
              <div style={styles.offerHeader}>
                <span style={styles.offerIcon}>👨‍👩‍👧‍👦</span>
                <h3 style={styles.offerTitle}>Family Pack (4 Tickets)</h3>
              </div>
              <p style={styles.offerDescription}>
                Bring the whole family to the match! Get 4 tickets at a special price 
                with snacks and drinks included.
              </p>
              <div style={styles.offerPricing}>
                <span style={styles.offerOriginalPrice}>€120.00</span>
                <span style={styles.offerCurrentPrice}>€89.99/match</span>
                <span style={styles.offerDiscount}>Save 25%</span>
              </div>
              <div style={styles.offerFeatures}>
                <div style={styles.offerFeature}>✓ 4 match tickets</div>
                <div style={styles.offerFeature}>✓ Snack & drink combo</div>
                <div style={styles.offerFeature}>✓ Kids activity pack</div>
                <div style={styles.offerFeature}>✓ Flexible date selection</div>
              </div>
              <button onClick={() => navigate('/matches')} style={styles.offerBtn}>
                Book Now →
              </button>
            </div>

            {/* VIP Experience */}
            <div style={styles.offerCard}>
              <div style={styles.offerBadgePremium}>PREMIUM</div>
              <div style={styles.offerHeader}>
                <span style={styles.offerIcon}>⭐</span>
                <h3 style={styles.offerTitle}>VIP Match Experience</h3>
              </div>
              <p style={styles.offerDescription}>
                Experience the ultimate match day with VIP treatment. 
                Premium seating, hospitality lounge, and meet & greet opportunities.
              </p>
              <div style={styles.offerPricing}>
                <span style={styles.offerOriginalPrice}>€150.00</span>
                <span style={styles.offerCurrentPrice}>€108.00/match</span>
                <span style={styles.offerDiscount}>Save 28%</span>
              </div>
              <div style={styles.offerFeatures}>
                <div style={styles.offerFeature}>✓ VIP lounge access</div>
                <div style={styles.offerFeature}>✓ Premium seating</div>
                <div style={styles.offerFeature}>✓ Gourmet dining</div>
                <div style={styles.offerFeature}>✓ Free parking</div>
              </div>
              <button onClick={handleBuyVipExperience} style={styles.offerBtn}>
                Upgrade Your Experience →
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.section : screenSize === 'tablet' ? responsiveStyles.tablet.section : styles.section}>
          <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
          <div style={screenSize === 'mobile' ? responsiveStyles.mobile.quickActions : screenSize === 'tablet' ? responsiveStyles.tablet.quickActions : styles.quickActions}>
            <a href="/matches" style={styles.quickActionBtn}>
              <span style={styles.quickActionIcon}>⚽</span>
              <span>Browse Matches</span>
            </a>
            <a href="/stadiums" style={styles.quickActionBtn}>
              <span style={styles.quickActionIcon}>🏟️</span>
              <span>View Stadiums</span>
            </a>
            <a href="/tickets" style={styles.quickActionBtn}>
              <span style={styles.quickActionIcon}>🎫</span>
              <span>My Tickets</span>
            </a>
            <a href="/orders" style={styles.quickActionBtn}>
              <span style={styles.quickActionIcon}>📋</span>
              <span>Order History</span>
            </a>
          </div>
        </div>

        {/* VIP Match Experience Modal */}
        {showVipModal && (
          <div style={styles.modalOverlay} onClick={() => setShowVipModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>⭐ VIP Match Experience Upgrade</h2>
                <button style={styles.modalCloseBtn} onClick={() => setShowVipModal(false)}>&times;</button>
              </div>

              {!purchaseSuccess ? (
                <>
                  <div style={styles.summaryBox}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>🎁 VIP Premium Benefits</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
                      <li>Access to VIP hospitality lounge & gourmet dining</li>
                      <li>Best category seat selection at the stadium</li>
                      <li>Free stadium parking voucher & activity guide</li>
                      <li>VIP fast-track security access lanes</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={styles.sectionsTitle}>Select Match for VIP Upgrade</h4>
                    {allUpcomingMatches.length > 0 ? (
                      <select
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: '#2c3e50',
                          backgroundColor: '#f8f9fa',
                          fontWeight: '600',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                        value={vipMatchId}
                        onChange={(e) => setVipMatchId(e.target.value)}
                      >
                        {allUpcomingMatches.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.homeTeam} vs {m.awayTeam} ({formatDate(m.matchDate)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p style={{ margin: 0, color: '#e74c3c', fontSize: '14px', fontWeight: '600' }}>No upcoming matches available for VIP upgrade.</p>
                    )}
                  </div>

                  {hasVipThisMonth && (
                    <div style={{ ...styles.errorBanner, margin: '0 0 20px 0', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                      ⚠️ <strong>Monthly Limit Exceeded:</strong> You have already purchased a VIP Match Experience this calendar month. Limit: 1 per month.
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={styles.sectionsTitle}>Select Payment Method</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { id: 'credit-card', name: 'Credit Card', icon: '💳' },
                        { id: 'paypal', name: 'PayPal', icon: '🅿️' },
                        { id: 'bank-transfer', name: 'Bank Transfer', icon: '🏦' }
                      ].map(pm => (
                        <div
                          key={pm.id}
                          style={{
                            ...styles.paymentCard,
                            borderColor: paymentMethod === pm.id ? '#2c3e50' : '#e9ecef',
                            backgroundColor: paymentMethod === pm.id ? '#f0f4f8' : 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                          onClick={() => {
                            if (!hasVipThisMonth) setPaymentMethod(pm.id);
                          }}
                        >
                          <span>{pm.icon}</span>
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>{pm.name}</span>
                          {paymentMethod === pm.id && <span style={{ marginLeft: 'auto', color: '#27ae60', fontWeight: 'bold' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'credit-card' && !hasVipThisMonth && (
                    <div style={{ ...styles.cardForm, padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={styles.formLabel}>Card Number</label>
                        <input style={styles.formInput} placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} />
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={styles.formLabel}>Cardholder Name</label>
                        <input style={styles.formInput} placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={styles.formLabel}>Expiry Date</label>
                          <input style={styles.formInput} placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={styles.formLabel}>CVC</label>
                          <input style={styles.formInput} placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                        </div>
                      </div>
                    </div>
                  )}

                  {error && <div style={{ ...styles.errorBanner, margin: '10px 0' }}>{error}</div>}

                  <div style={{ ...styles.priceBreakdown, padding: '12px', borderRadius: '8px', backgroundColor: '#f8f9fa', marginBottom: '20px' }}>
                    <div style={styles.summaryRow}><span>Original Price</span><span style={{ textDecoration: 'line-through', color: '#999' }}>€{currentVipPrice.toFixed(2)}</span></div>
                    <div style={styles.summaryRow}><span style={{ color: '#27ae60' }}>VIP Package Discount (28%)</span><span style={{ color: '#27ae60', fontWeight: 'bold' }}>-€{currentDiscount.toFixed(2)}</span></div>
                    <div style={{ ...styles.summaryRow, ...styles.totalRow, borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                      <span>Total Price</span>
                      <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#2c3e50' }}>€{currentTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={() => setShowVipModal(false)}>Cancel</button>
                    <button
                      style={{ ...styles.primaryBtn, backgroundColor: '#27ae60', flex: 1.5, opacity: purchasing || !paymentMethod || hasVipThisMonth ? 0.6 : 1 }}
                      onClick={handleConfirmVipPurchase}
                      disabled={purchasing || !paymentMethod || hasVipThisMonth}
                    >
                      {purchasing ? '⏳ Processing...' : `✅ Purchase VIP Pass (€${currentTotal.toFixed(2)})`}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <span style={{ fontSize: '64px' }}>✅</span>
                  <h3 style={{ color: '#27ae60', margin: '16px 0 8px 0' }}>VIP Upgrade Activated!</h3>
                  <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
                    Congratulations! You have successfully upgraded to the VIP Match Experience for <strong>{allUpcomingMatches.find(m => m.id === vipMatchId) ? `${allUpcomingMatches.find(m => m.id === vipMatchId).homeTeam} vs ${allUpcomingMatches.find(m => m.id === vipMatchId).awayTeam}` : 'your selected match'}</strong>.
                  </p>
                  <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', margin: '20px 0', fontSize: '14px' }}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '600' }}>Order Number: {lastOrderNum}</p>
                    <p style={{ margin: 0 }}>VIP Pass status: Active</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button style={styles.primaryBtn} onClick={() => { setShowVipModal(false); navigate('/orders'); }}>View My Orders</button>
                    <button style={styles.secondaryBtn} onClick={() => { setShowVipModal(false); setPurchaseSuccess(false); }}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  nav: {
    backgroundColor: '#2c3e50',
    padding: '15px 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navTitle: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '14px',
  },
  userName: {
    color: '#bdc3c7',
    fontSize: '14px',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid white',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  welcome: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  subtitle: {
    color: '#7f8c8d',
    fontSize: '18px',
    marginTop: '10px',
  },
  onlineStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#27ae60',
    marginTop: '10px',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#27ae60',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  dashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    color: '#2c3e50',
  },
  cardLink: {
    display: 'inline-block',
    marginTop: '12px',
    color: '#3498db',
    textDecoration: 'none',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '30px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0',
    color: '#2c3e50',
  },
  viewAllLink: {
    color: '#3498db',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
  },
  loadingText: {
    textAlign: 'center',
    padding: '20px',
    color: '#7f8c8d',
  },
  noMatches: {
    textAlign: 'center',
    padding: '20px',
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  matchesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  matchCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e9ecef',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  matchTeams: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  teamName: {
    fontWeight: '600',
    fontSize: '16px',
    color: '#2c3e50',
  },
  vs: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  matchInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '8px 0',
    borderTop: '1px solid #dee2e6',
    borderBottom: '1px solid #dee2e6',
  },
  matchDate: {
    fontSize: '13px',
    color: '#555',
  },
  matchCompetition: {
    fontSize: '12px',
    color: '#f39c12',
    backgroundColor: '#fef9e7',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  matchFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchStadium: {
    fontSize: '12px',
    color: '#7f8c8d',
  },
  buyTicketsBtn: {
    backgroundColor: '#27ae60',
    color: 'white',
    padding: '6px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
    border: 'none',
    cursor: 'pointer',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  quickActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#2c3e50',
    fontWeight: '600',
    transition: 'background-color 0.2s, transform 0.2s',
    border: '1px solid #e9ecef',
  },
  quickActionIcon: {
    fontSize: '24px',
  },
  // Special Offers styles
  offersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #e9ecef',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
  },
  offerBadge: {
    position: 'absolute',
    top: '12px',
    right: '-30px',
    backgroundColor: '#27ae60',
    color: 'white',
    padding: '4px 40px',
    fontSize: '11px',
    fontWeight: 'bold',
    transform: 'rotate(45deg)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  offerBadgeSecondary: {
    position: 'absolute',
    top: '12px',
    right: '-25px',
    backgroundColor: '#3498db',
    color: 'white',
    padding: '4px 35px',
    fontSize: '11px',
    fontWeight: 'bold',
    transform: 'rotate(45deg)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  offerBadgePremium: {
    position: 'absolute',
    top: '12px',
    right: '-25px',
    backgroundColor: '#f39c12',
    color: 'white',
    padding: '4px 35px',
    fontSize: '11px',
    fontWeight: 'bold',
    transform: 'rotate(45deg)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  offerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    marginTop: '8px',
  },
  offerIcon: {
    fontSize: '32px',
  },
  offerTitle: {
    margin: '0',
    fontSize: '18px',
    color: '#2c3e50',
    fontWeight: '700',
  },
  offerDescription: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  offerPricing: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  offerOriginalPrice: {
    fontSize: '16px',
    color: '#95a5a6',
    textDecoration: 'line-through',
  },
  offerCurrentPrice: {
    fontSize: '22px',
    color: '#e74c3c',
    fontWeight: '700',
  },
  offerDiscount: {
    backgroundColor: '#e74c3c',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  offerFeatures: {
    marginBottom: '20px',
    flexGrow: 1,
  },
  offerFeature: {
    fontSize: '13px',
    color: '#2c3e50',
    padding: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  offerBtn: {
    display: 'block',
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '16px',
    width: '500px',
    maxWidth: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    position: 'relative',
    textAlign: 'left',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #eee',
    paddingBottom: '12px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    fontWeight: '300',
    color: '#95a5a6',
    cursor: 'pointer',
    padding: '0 8px',
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e9ecef',
  },
  sectionsTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#2c3e50',
    fontWeight: '600'
  },
  paymentCard: {
    transition: 'all 0.2s',
  },
  cardForm: {
    backgroundColor: '#fff',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  formLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '4px',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    textAlign: 'center',
  },
  priceBreakdown: {
    border: '1px solid #e9ecef',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '13px',
    color: '#555',
  },
  totalRow: {
    fontWeight: 'bold',
    fontSize: '15px',
    color: '#2c3e50',
  },
  primaryBtn: {
    padding: '10px 16px',
    backgroundColor: '#2c3e50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  secondaryBtn: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#2c3e50',
    border: '1px solid #2c3e50',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};

// Responsive styles
const responsiveStyles = {
  mobile: {
    main: {
      ...styles.main,
      padding: '20px 15px',
    },
    dashboard: {
      ...styles.dashboard,
      gridTemplateColumns: '1fr',
      gap: '15px',
    },
    section: {
      ...styles.section,
      padding: '16px',
    },
    sectionHeader: {
      ...styles.sectionHeader,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '10px',
    },
    matchesGrid: {
      ...styles.matchesGrid,
      gridTemplateColumns: '1fr',
      gap: '12px',
    },
    offersGrid: {
      ...styles.offersGrid,
      gridTemplateColumns: '1fr',
      gap: '16px',
    },
    quickActions: {
      ...styles.quickActions,
      gridTemplateColumns: '1fr',
      gap: '12px',
    },
  },
  tablet: {
    main: {
      ...styles.main,
      padding: '30px 15px',
    },
    dashboard: {
      ...styles.dashboard,
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
    },
    section: {
      ...styles.section,
      padding: '20px',
    },
    matchesGrid: {
      ...styles.matchesGrid,
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '14px',
    },
    offersGrid: {
      ...styles.offersGrid,
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
    },
    quickActions: {
      ...styles.quickActions,
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '14px',
    },
  }
};

export default Home;
