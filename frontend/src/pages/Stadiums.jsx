import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

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

const Stadiums = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Sample stadium data
  const stadiums = [
    {
      id: 1,
      name: 'National Stadium (Air Albania Stadium)',
      city: 'Tirana',
      capacity: 22500,
      opened: 2019,
      description: 'The national stadium of Albania, home to the Albania national football team.',
      sections: [
        { name: 'VIP North', seats: 2500, priceMultiplier: 3.0 },
        { name: 'East Stand', seats: 7000, priceMultiplier: 1.5 },
        { name: 'West Stand', seats: 7000, priceMultiplier: 1.5 },
        { name: 'South Stand', seats: 6000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 2,
      name: 'Partizani Stadium',
      city: 'Tirana',
      capacity: 8500,
      opened: 2018,
      description: 'Home stadium of FK Partizani Tirana.',
      sections: [
        { name: 'VIP', seats: 500, priceMultiplier: 2.5 },
        { name: 'North', seats: 3000, priceMultiplier: 1.2 },
        { name: 'South', seats: 5000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 3,
      name: 'Selman Stërmasi Stadium',
      city: 'Tirana',
      capacity: 9500,
      opened: 1956,
      description: 'Historic stadium, home to KF Tirana.',
      sections: [
        { name: 'VIP', seats: 400, priceMultiplier: 2.0 },
        { name: 'Main Stand', seats: 4100, priceMultiplier: 1.3 },
        { name: 'Away Stand', seats: 5000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 4,
      name: 'Skënderbeu Stadium',
      city: 'Korçë',
      capacity: 12000,
      opened: 1959,
      description: 'Home stadium of KF Skënderbeu Korçë.',
      sections: [
        { name: 'VIP', seats: 600, priceMultiplier: 2.0 },
        { name: 'East', seats: 4200, priceMultiplier: 1.2 },
        { name: 'West', seats: 7200, priceMultiplier: 1.0 }
      ]
    }
  ];

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        <div style={styles.header}>
          <h1>🏟️ Stadiums</h1>
          <p>Explore our partner stadiums and their seating arrangements</p>
        </div>

        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.grid : screenSize === 'tablet' ? responsiveStyles.tablet.grid : styles.grid}>
          {stadiums.map(stadium => (
            <div key={stadium.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.stadiumName}>{stadium.name}</h3>
                <span style={styles.city}>{stadium.city}</span>
              </div>
              
              <p style={styles.description}>{stadium.description}</p>
              
              <div style={styles.info}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Capacity</span>
                  <span style={styles.infoValue}>{stadium.capacity.toLocaleString()} seats</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Opened</span>
                  <span style={styles.infoValue}>{stadium.opened}</span>
                </div>
              </div>

              <div style={styles.sections}>
                <h4 style={styles.sectionsTitle}>Seating Sections</h4>
                {stadium.sections.map((section, idx) => (
                  <div key={idx} style={styles.sectionRow}>
                    <span style={styles.sectionName}>{section.name}</span>
                    <span style={styles.sectionSeats}>{section.seats} seats</span>
                    <span style={styles.sectionPrice}>x{section.priceMultiplier}</span>
                  </div>
                ))}
              </div>

              <button style={styles.viewBtn}>View on Map</button>
            </div>
          ))}
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
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  stadiumName: {
    margin: '0',
    fontSize: '18px',
    color: '#2c3e50',
    flex: 1,
  },
  city: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    marginLeft: '12px',
  },
  description: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  info: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sections: {
    marginBottom: '16px',
  },
  sectionsTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#2c3e50',
  },
  sectionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    fontSize: '14px',
  },
  sectionName: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  sectionSeats: {
    color: '#7f8c8d',
  },
  sectionPrice: {
    color: '#27ae60',
    fontWeight: '600',
  },
  viewBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2c3e50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: 'auto',
  },
};

// Responsive styles
const responsiveStyles = {
  mobile: {
    main: {
      ...styles.main,
      padding: '20px 15px',
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

export default Stadiums;
