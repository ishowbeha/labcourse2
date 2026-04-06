import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import MatchService from '../services/MatchService';

const Home = () => {
  const { user, isAdmin, logout } = useAuth();
  const { connected, onlineCount } = useSocket();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchUpcomingMatches();
  }, []);

  const fetchUpcomingMatches = async () => {
    try {
      const matches = await MatchService.getUpcomingMatches();
      // Get only the first 3 upcoming matches
      setUpcomingMatches(matches.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch upcoming matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={styles.main}>
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

        <div style={styles.dashboard}>
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
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>🔥 Upcoming Featured Matches</h2>
            <a href="/matches" style={styles.viewAllLink}>View All Matches →</a>
          </div>
          
          {loadingMatches ? (
            <div style={styles.loadingText}>Loading matches...</div>
          ) : upcomingMatches.length > 0 ? (
            <div style={styles.matchesGrid}>
              {upcomingMatches.map(match => (
                <div key={match.id} style={styles.matchCard}>
                  <div style={styles.matchTeams}>
                    <span style={styles.teamName}>{match.homeTeam}</span>
                    <span style={styles.vs}>VS</span>
                    <span style={styles.teamName}>{match.awayTeam}</span>
                  </div>
                  <div style={styles.matchInfo}>
                    <span style={styles.matchDate}>📅 {formatDate(match.matchDate)}</span>
                    <span style={styles.matchCompetition}>{match.competition}</span>
                  </div>
                  <div style={styles.matchFooter}>
                    <span style={styles.matchStadium}>{match.stadiumName || 'TBA'}</span>
                    <a href={`/matches`} style={styles.buyTicketsBtn}>
                      Get Tickets →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.noMatches}>No upcoming matches available at the moment.</div>
          )}
        </div>

        {/* Special Offers */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🎁 Special Offers & Promotions</h2>
          <div style={styles.offersGrid}>
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
              <a href="/stadiums" style={styles.offerBtn}>
                Choose Your Stadium →
              </a>
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
              <a href="/tickets" style={styles.offerBtn}>
                Book Now →
              </a>
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
                <span style={styles.offerOriginalPrice}>€250.00</span>
                <span style={styles.offerCurrentPrice}>€179.99/match</span>
                <span style={styles.offerDiscount}>Save 28%</span>
              </div>
              <div style={styles.offerFeatures}>
                <div style={styles.offerFeature}>✓ VIP lounge access</div>
                <div style={styles.offerFeature}>✓ Premium seating</div>
                <div style={styles.offerFeature}>✓ Gourmet dining</div>
                <div style={styles.offerFeature}>✓ Free parking</div>
              </div>
              <a href="/tickets" style={styles.offerBtn}>
                Upgrade Your Experience →
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
          <div style={styles.quickActions}>
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
};

export default Home;
