import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MatchService from '../services/MatchService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';
import Navbar from '../components/Navbar';

const Matches = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchMatches();
  }, [filters]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const data = await MatchService.getAllMatches(filters);
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getRelativeTime = (dateStr, timeStr) => {
    const matchDate = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    const diffMs = matchDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
    return `In ${Math.floor(diffDays / 30)} months`;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        <div style={styles.header}>
          <h1>⚽ Upcoming Matches</h1>
          <p>Select a match to view available tickets and seat options</p>
        </div>

        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.filters : styles.filters}>
          <select 
            style={styles.select} 
            value={filters.competition || ''}
            onChange={(e) => handleFilterChange('competition', e.target.value)}
          >
            <option value="">All Competitions</option>
            <option value="Friendly Match">Friendly Match</option>
            <option value="UEFA Nations League">UEFA Nations League</option>
            <option value="Euro 2028 Qualifiers">Euro 2028 Qualifiers</option>
            <option value="Kategoria Superiore">Kategoria Superiore</option>
            <option value="Football Superleague of Kosova">Football Superleague of Kosova</option>
            <option value="U21 Championship">U21 Championship</option>
          </select>
          <input 
            type="text" 
            style={styles.input} 
            placeholder="Search team..."
            value={filters.team || ''}
            onChange={(e) => handleFilterChange('team', e.target.value)}
          />
          <button style={styles.searchBtn} onClick={() => fetchMatches()}>Search</button>
        </div>

        {loading ? (
          <div style={styles.loading}>
            <p>Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div style={styles.empty}>
            <p>No upcoming matches found</p>
          </div>
        ) : (
          <div style={screenSize === 'mobile' ? responsiveStyles.mobile.grid : screenSize === 'tablet' ? responsiveStyles.tablet.grid : styles.grid}>
            {matches.map(match => (
              <div key={match.id} style={styles.card}>
                <div style={styles.matchHeader}>
                  <span style={styles.competition}>{match.competition}</span>
                  <span style={styles.timeAgo}>{getRelativeTime(match.matchDate, match.matchTime)}</span>
                </div>
                
                <div style={styles.teams}>
                  <span style={styles.team}>{match.homeTeam}</span>
                  <span style={styles.vs}>VS</span>
                  <span style={styles.team}>{match.awayTeam}</span>
                </div>
                
                <div style={styles.info}>
                  <p style={styles.infoItem}>📅 {formatDate(match.matchDate)} at {match.matchTime}</p>
                  <p style={styles.infoItem}>🏟️ {match.stadiumName || `Stadium #${match.stadiumId}`}</p>
                </div>
                
                <div style={styles.footer}>
                  <span style={styles.price}>From €{match.basePrice}</span>
                  <button style={styles.buyBtn}>Buy Tickets</button>
                </div>
              </div>
            ))}
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
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '30px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  select: {
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '200px',
  },
  input: {
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '180px',
  },
  searchBtn: {
    padding: '10px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  matchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  competition: {
    fontSize: '12px',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  timeAgo: {
    fontSize: '12px',
    color: '#27ae60',
    fontWeight: '600',
  },
  teams: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  team: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  vs: {
    fontSize: '14px',
    color: '#bdc3c7',
    fontWeight: '600',
  },
  info: {
    marginBottom: '16px',
  },
  infoItem: {
    fontSize: '14px',
    color: '#7f8c8d',
    margin: '4px 0',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #eee',
  },
  price: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  buyBtn: {
    padding: '10px 24px',
    backgroundColor: '#2c3e50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#7f8c8d',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#7f8c8d',
  },
};

// Responsive styles
const responsiveStyles = {
  mobile: {
    main: {
      ...styles.main,
      padding: '20px 15px',
    },
    filters: {
      ...styles.filters,
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    grid: {
      ...styles.grid,
      gridTemplateColumns: '1fr',
      gap: '16px',
    },
  },
  tablet: {
    main: {
      ...styles.main,
      padding: '30px 15px',
    },
    grid: {
      ...styles.grid,
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px',
    },
  }
};

export default Matches;
