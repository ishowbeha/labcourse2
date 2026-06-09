import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Modal, Form, Alert, Badge, Spinner,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LazyNavbar from '../components/layout/LazyNavbar';
import MatchService from '../services/MatchService';
import FootballService from '../services/FootballService';
import { getFlagUrl } from '../utils/flags';
import axios from 'axios';
import OrderService from '../services/OrderService';

const Home = () => {
  const { user, isAdmin, logout } = useAuth();
  const { connected, onlineCount } = useSocket();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
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

    let multiplier = 1.7;
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
        `Discount: ${discountAmount.toFixed(2)}`,
        `MatchDate: ${selectedMatch?.matchDate || 'TBD'}`,
        `Stadium: ${stadiumName}`,
        `Competition: ${selectedMatch?.competition || 'FIFA World Cup 2026'}`
      ];
      const notesStr = noteDetails.join(' | ');

      let orderNumber = '';
      let apiPurchaseSucceeded = false;

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/orders/simple-purchase', {
          matchName: matchName,
          sectionName: 'VIP Seating & Lounge',
          quantity: 1,
          totalAmount: finalPrice,
          paymentMethod: paymentMethod,
          notes: 'VIP Experience | ' + notesStr,
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
      const [localMatches, apiData] = await Promise.all([
        MatchService.getUpcomingMatches().catch(() => []),
        FootballService.getUpcomingFootballMatches(50).catch(() => [])
      ]);

      const allMatches = [];

      localMatches.forEach(m => {
        if ((m.competition || '').toLowerCase().includes('world cup')) {
          allMatches.push({
            ...m,
            _sortDate: m.matchDate || ''
          });
        }
      });

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

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

      const upcomingSorted = allMatches
        .filter(m => {
          if (!m._sortDate) return false;
          const home = (m.homeTeam || '').toLowerCase();
          const away = (m.awayTeam || '').toLowerCase();
          if ((home.includes('brazil') && away.includes('serbia')) || (home.includes('serbia') && away.includes('brazil'))) {
            return false;
          }
          return m._sortDate > todayStr || (m._sortDate === todayStr && (!m.matchTime || m.matchTime >= currentTime));
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

  const vipSelectedMatch = allUpcomingMatches.find(m => m.id === vipMatchId);

  const offers = [
    {
      badge: 'BEST VALUE',
      badgeVariant: 'success',
      icon: '🏟️',
      title: 'Season Stadium Pass',
      description: 'Get unlimited access to all matches at your favorite stadium for an entire year! Perfect for die-hard fans who never want to miss a game.',
      originalPrice: '€299.99',
      currentPrice: '€199.99/year',
      discount: 'Save 33%',
      features: ['Access to ALL home matches', 'Priority seat selection', '10% off merchandise', 'Exclusive fan events'],
      onClick: () => navigate('/stadiums'),
      buttonText: 'Choose Your Stadium →',
    },
    {
      badge: 'POPULAR',
      badgeVariant: 'primary',
      icon: '👨‍👩‍👧‍👦',
      title: 'Family Pack (4 Tickets)',
      description: 'Bring the whole family to the match! Get 4 tickets at a special price with snacks and drinks included.',
      originalPrice: '€120.00',
      currentPrice: '€89.99/match',
      discount: 'Save 25%',
      features: ['4 match tickets', 'Snack & drink combo', 'Kids activity pack', 'Flexible date selection'],
      onClick: () => navigate('/matches'),
      buttonText: 'Book Now →',
    },
    {
      badge: 'PREMIUM',
      badgeVariant: 'warning',
      icon: '⭐',
      title: 'VIP Match Experience',
      description: 'Experience the ultimate match day with VIP treatment. Premium seating, hospitality lounge, and meet & greet opportunities.',
      originalPrice: '€150.00',
      currentPrice: '€108.00/match',
      discount: 'Save 28%',
      features: ['VIP lounge access', 'Premium seating', 'Gourmet dining', 'Free parking'],
      onClick: handleBuyVipExperience,
      buttonText: 'Upgrade Your Experience →',
    },
  ];

  const quickActions = [
    { href: '/matches', icon: '⚽', label: 'Browse Matches' },
    { href: '/stadiums', icon: '🏟️', label: 'View Stadiums' },
    { href: '/tickets', icon: '🎫', label: 'My Tickets' },
    { href: '/orders', icon: '📋', label: 'Order History' },
  ];

  const paymentMethods = [
    { id: 'credit-card', name: 'Credit Card', icon: '💳' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️' },
    { id: 'bank-transfer', name: 'Bank Transfer', icon: '🏦' },
  ];

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />

      <Container className="py-4 py-md-5">
        <div className="text-center mb-4 mb-md-5">
          <h1 className="h2">🏟️ Welcome, {user?.firstName || user?.first_name}!</h1>
          <p className="text-muted fs-5">Stadium Ticket Management System</p>
          {connected && (
            <p className="text-success small mb-0">
              <span className="d-inline-block rounded-circle bg-success me-1 online-dot" />
              {onlineCount} user{onlineCount !== 1 ? 's' : ''} online
            </p>
          )}
        </div>

        <Row className="g-4 mb-4 mb-md-5">
          <Col md={6} lg={4}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <Card.Title>⚽ Matches</Card.Title>
                <Card.Text>Browse upcoming football matches and purchase tickets.</Card.Text>
                <Card.Link href="/matches">View Matches →</Card.Link>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <Card.Title>🎫 My Tickets</Card.Title>
                <Card.Text>View and manage your purchased tickets.</Card.Text>
                <Card.Link href="/tickets">View Tickets →</Card.Link>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <Card.Title>📋 Orders</Card.Title>
                <Card.Text>Check your order history and status.</Card.Text>
                <Card.Link href="/orders">View Orders →</Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="shadow-sm border-0 mb-4">
          <Card.Body>
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-4">
              <Card.Title as="h2" className="h4 mb-0">🔥 Upcoming Featured Matches</Card.Title>
              <Card.Link href="/matches">View All Matches →</Card.Link>
            </div>

            {loadingMatches ? (
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" role="status" />
                <span className="text-muted ms-2">Loading matches...</span>
              </div>
            ) : upcomingMatches.length > 0 ? (
              <Row className="g-3">
                {upcomingMatches.map(match => (
                  <Col key={match.id} md={6} lg={4}>
                    <Card className="bg-light h-100">
                      <Card.Body>
                        <div className="d-flex justify-content-center align-items-center gap-2 mb-3 flex-wrap">
                          <span className="fw-semibold d-flex align-items-center gap-1">
                            {getFlagUrl(match.homeTeam)
                              ? <img src={getFlagUrl(match.homeTeam)} alt={match.homeTeam} style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                              : <span style={{ fontSize: '1.2em' }}>🏳️</span>
                            }
                            {match.homeTeam}
                          </span>
                          <Badge bg="danger">VS</Badge>
                          <span className="fw-semibold d-flex align-items-center gap-1">
                            {getFlagUrl(match.awayTeam)
                              ? <img src={getFlagUrl(match.awayTeam)} alt={match.awayTeam} style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                              : <span style={{ fontSize: '1.2em' }}>🏳️</span>
                            }
                            {match.awayTeam}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center py-2 border-top border-bottom mb-3 small">
                          <span>📅 {formatDate(match.matchDate)}</span>
                          <Badge bg="warning" text="dark">🏆 {match.competition || 'FIFA World Cup 2026'}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">{getRealStadium(match.homeTeam, match.stadiumName)}</small>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => navigate(`/tickets?matchId=${match.id}`, { state: { match } })}
                          >
                            Get Tickets →
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <p className="text-center text-muted fst-italic mb-0">No upcoming matches available at the moment.</p>
            )}
          </Card.Body>
        </Card>

        <Card className="shadow-sm border-0 mb-4">
          <Card.Body>
            <Card.Title as="h2" className="h4 mb-4">🎁 Special Offers & Promotions</Card.Title>
            <Row className="g-4">
              {offers.map((offer) => (
                <Col key={offer.title} md={6} lg={4}>
                  <Card className="h-100 border-2 position-relative overflow-hidden">
                    <Badge bg={offer.badgeVariant} className="position-absolute top-0 end-0 m-2 offer-ribbon">
                      {offer.badge}
                    </Badge>
                    <Card.Body className="d-flex flex-column">
                      <div className="d-flex align-items-center gap-2 mb-2 mt-2">
                        <span className="fs-3">{offer.icon}</span>
                        <Card.Title className="h5 mb-0">{offer.title}</Card.Title>
                      </div>
                      <Card.Text className="small text-muted">{offer.description}</Card.Text>
                      <div className="bg-light rounded p-3 mb-3 d-flex flex-wrap align-items-center gap-2">
                        <span className="text-muted text-decoration-line-through">{offer.originalPrice}</span>
                        <span className="text-danger fw-bold fs-5">{offer.currentPrice}</span>
                        <Badge bg="danger">{offer.discount}</Badge>
                      </div>
                      <ul className="list-unstyled small flex-grow-1 mb-3">
                        {offer.features.map((f) => (
                          <li key={f} className="py-1">✓ {f}</li>
                        ))}
                      </ul>
                      <Button variant="dark" className="w-100 mt-auto" onClick={offer.onClick}>
                        {offer.buttonText}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>

        <Card className="shadow-sm border-0">
          <Card.Body>
            <Card.Title as="h2" className="h4 mb-4">⚡ Quick Actions</Card.Title>
            <Row className="g-3">
              {quickActions.map((action) => (
                <Col key={action.href} xs={12} sm={6} md={3}>
                  <a href={action.href} className="d-flex align-items-center gap-3 p-3 bg-light rounded text-decoration-none text-dark border fw-semibold quick-action-link">
                    <span className="fs-4">{action.icon}</span>
                    <span>{action.label}</span>
                  </a>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      </Container>

      <Modal show={showVipModal} onHide={() => setShowVipModal(false)} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>⭐ VIP Match Experience Upgrade</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!purchaseSuccess ? (
            <>
              <Alert variant="light" className="border">
                <Alert.Heading as="h6" className="mb-2">🎁 VIP Premium Benefits</Alert.Heading>
                <ul className="small mb-0 ps-3">
                  <li>Access to VIP hospitality lounge & gourmet dining</li>
                  <li>Best category seat selection at the stadium</li>
                  <li>Free stadium parking voucher & activity guide</li>
                  <li>VIP fast-track security access lanes</li>
                </ul>
              </Alert>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Select Match for VIP Upgrade</Form.Label>
                {allUpcomingMatches.length > 0 ? (
                  <Form.Select value={vipMatchId} onChange={(e) => setVipMatchId(e.target.value)}>
                    {allUpcomingMatches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.homeTeam} vs {m.awayTeam} ({formatDate(m.matchDate)})
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Alert variant="danger" className="mb-0 py-2">No upcoming matches available for VIP upgrade.</Alert>
                )}
              </Form.Group>

              {hasVipThisMonth && (
                <Alert variant="warning">
                  ⚠️ <strong>Monthly Limit Exceeded:</strong> You have already purchased a VIP Match Experience this calendar month. Limit: 1 per month.
                </Alert>
              )}

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Select Payment Method</Form.Label>
                <div className="d-flex flex-column gap-2">
                  {paymentMethods.map(pm => (
                    <Card
                      key={pm.id}
                      className={`mb-0 ${paymentMethod === pm.id ? 'border-dark bg-light' : ''}`}
                      role="button"
                      onClick={() => { if (!hasVipThisMonth) setPaymentMethod(pm.id); }}
                    >
                      <Card.Body className="py-2 d-flex align-items-center gap-2">
                        <span>{pm.icon}</span>
                        <span className="fw-semibold small">{pm.name}</span>
                        {paymentMethod === pm.id && <span className="ms-auto text-success fw-bold">✓</span>}
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </Form.Group>

              {paymentMethod === 'credit-card' && !hasVipThisMonth && (
                <Card className="mb-4">
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">Card Number</Form.Label>
                      <Form.Control placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">Cardholder Name</Form.Label>
                      <Form.Control placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                    </Form.Group>
                    <Row>
                      <Col>
                        <Form.Group className="mb-0">
                          <Form.Label className="small fw-semibold">Expiry Date</Form.Label>
                          <Form.Control placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} />
                        </Form.Group>
                      </Col>
                      <Col>
                        <Form.Group className="mb-0">
                          <Form.Label className="small fw-semibold">CVC</Form.Label>
                          <Form.Control placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {error && <Alert variant="danger">{error}</Alert>}

              <Card className="bg-light mb-0">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between small py-1">
                    <span>Original Price</span>
                    <span className="text-muted text-decoration-line-through">€{currentVipPrice.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between small py-1 text-success">
                    <span>VIP Package Discount (28%)</span>
                    <span className="fw-bold">-€{currentDiscount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 mt-2 border-top fw-bold">
                    <span>Total Price</span>
                    <span className="fs-5">€{currentTotal.toFixed(2)}</span>
                  </div>
                </Card.Body>
              </Card>
            </>
          ) : (
            <div className="text-center py-3">
              <div className="display-3">✅</div>
              <h3 className="text-success mt-3">VIP Upgrade Activated!</h3>
              <p className="text-muted small">
                Congratulations! You have successfully upgraded to the VIP Match Experience for{' '}
                <strong>{vipSelectedMatch ? `${vipSelectedMatch.homeTeam} vs ${vipSelectedMatch.awayTeam}` : 'your selected match'}</strong>.
              </p>
              <Alert variant="light" className="text-start small">
                <p className="mb-1 fw-semibold">Order Number: {lastOrderNum}</p>
                <p className="mb-0">VIP Pass status: Active</p>
              </Alert>
              <div className="d-flex gap-2 justify-content-center flex-wrap">
                <Button variant="dark" onClick={() => { setShowVipModal(false); navigate('/orders'); }}>View My Orders</Button>
                <Button variant="outline-secondary" onClick={() => { setShowVipModal(false); setPurchaseSuccess(false); }}>Close</Button>
              </div>
            </div>
          )}
        </Modal.Body>
        {!purchaseSuccess && (
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowVipModal(false)}>Cancel</Button>
            <Button
              variant="success"
              onClick={handleConfirmVipPurchase}
              disabled={purchasing || !paymentMethod || hasVipThisMonth}
            >
              {purchasing ? '⏳ Processing...' : `✅ Purchase VIP Pass (€${currentTotal.toFixed(2)})`}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default Home;
