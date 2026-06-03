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

  // Complete stadium data — all 16 FIFA World Cup 2026 host stadiums
  const stadiums = [
    // ===== FIFA WORLD CUP 2026 — UNITED STATES (11 stadiums) =====
    {
      id: 1,
      name: 'Mercedes-Benz Stadium',
      city: 'Atlanta',
      country: 'USA',
      capacity: 71000,
      opened: 2017,
      description: 'State-of-the-art retractable roof stadium hosting World Cup 2026 matches in Atlanta. Home of Atlanta United & Atlanta Falcons.',
      sections: [
        { name: 'VIP Suite', seats: 1800, priceMultiplier: 4.5 },
        { name: 'Club Level', seats: 8000, priceMultiplier: 3.0 },
        { name: 'Lower Bowl', seats: 28000, priceMultiplier: 2.0 },
        { name: 'Upper Bowl', seats: 33200, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 2,
      name: 'Gillette Stadium',
      city: 'Foxborough',
      country: 'USA',
      capacity: 65878,
      opened: 2002,
      description: 'Home of the New England Patriots and New England Revolution. Hosting World Cup 2026 matches in the Boston area.',
      sections: [
        { name: 'VIP Lounge', seats: 1200, priceMultiplier: 4.0 },
        { name: 'Club Seats', seats: 6000, priceMultiplier: 2.8 },
        { name: 'Lower Bowl', seats: 26000, priceMultiplier: 1.8 },
        { name: 'Upper Bowl', seats: 32678, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 3,
      name: 'AT&T Stadium',
      city: 'Arlington',
      country: 'USA',
      capacity: 80000,
      opened: 2009,
      description: 'Massive domed stadium hosting World Cup 2026 matches in the Dallas area. Home of the Dallas Cowboys.',
      sections: [
        { name: 'Founders Club', seats: 1056, priceMultiplier: 4.0 },
        { name: 'Lower Level', seats: 20900, priceMultiplier: 2.5 },
        { name: 'Mezzanine', seats: 14000, priceMultiplier: 1.8 },
        { name: 'Upper Level', seats: 31200, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 4,
      name: 'NRG Stadium',
      city: 'Houston',
      country: 'USA',
      capacity: 72220,
      opened: 2002,
      description: 'Iconic domed stadium hosting World Cup 2026 matches in Houston. Home of the Houston Texans.',
      sections: [
        { name: 'VIP Suite', seats: 1600, priceMultiplier: 4.0 },
        { name: 'Club Level', seats: 7500, priceMultiplier: 2.8 },
        { name: 'Lower Bowl', seats: 28000, priceMultiplier: 2.0 },
        { name: 'Upper Bowl', seats: 35120, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 5,
      name: 'Arrowhead Stadium',
      city: 'Kansas City',
      country: 'USA',
      capacity: 76416,
      opened: 1972,
      description: 'One of the loudest stadiums in the world, hosting World Cup 2026 matches in Kansas City. Home of the Kansas City Chiefs.',
      sections: [
        { name: 'VIP Suite', seats: 1400, priceMultiplier: 4.0 },
        { name: 'Club Level', seats: 7000, priceMultiplier: 2.8 },
        { name: 'Lower Bowl', seats: 30000, priceMultiplier: 1.8 },
        { name: 'Upper Bowl', seats: 38016, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 6,
      name: 'SoFi Stadium',
      city: 'Inglewood',
      country: 'USA',
      capacity: 70240,
      opened: 2020,
      description: 'State-of-the-art stadium hosting World Cup 2026 matches in Los Angeles. Home of the LA Rams & LA Chargers.',
      sections: [
        { name: 'VIP Lounge', seats: 810, priceMultiplier: 4.5 },
        { name: 'Platinum Level', seats: 12500, priceMultiplier: 3.0 },
        { name: 'Gold Level', seats: 19250, priceMultiplier: 2.0 },
        { name: 'Silver Level', seats: 18000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 7,
      name: 'Hard Rock Stadium',
      city: 'Miami Gardens',
      country: 'USA',
      capacity: 65326,
      opened: 1987,
      description: 'Premier South Florida stadium hosting World Cup 2026 matches. Home of the Miami Dolphins and Miami Open.',
      sections: [
        { name: 'VIP Suite', seats: 1500, priceMultiplier: 4.0 },
        { name: 'Club Level', seats: 7000, priceMultiplier: 2.8 },
        { name: 'Lower Bowl', seats: 25000, priceMultiplier: 2.0 },
        { name: 'Upper Bowl', seats: 31826, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 8,
      name: 'MetLife Stadium',
      city: 'East Rutherford',
      country: 'USA',
      capacity: 82500,
      opened: 2010,
      description: 'Iconic stadium hosting World Cup 2026 matches in the New York/New Jersey area. Home of the NY Giants & NY Jets.',
      sections: [
        { name: 'VIP Suite', seats: 1000, priceMultiplier: 4.0 },
        { name: 'Lower Bowl', seats: 24000, priceMultiplier: 2.5 },
        { name: 'Club Level', seats: 15000, priceMultiplier: 2.0 },
        { name: 'Upper Bowl', seats: 35000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 9,
      name: 'Lincoln Financial Field',
      city: 'Philadelphia',
      country: 'USA',
      capacity: 69596,
      opened: 2003,
      description: 'Historic Philadelphia stadium hosting World Cup 2026 matches. Home of the Philadelphia Eagles.',
      sections: [
        { name: 'VIP Suite', seats: 1200, priceMultiplier: 4.0 },
        { name: 'Club Level', seats: 6500, priceMultiplier: 2.5 },
        { name: 'Lower Bowl', seats: 27000, priceMultiplier: 1.8 },
        { name: 'Upper Bowl', seats: 34896, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 10,
      name: "Levi's Stadium",
      city: 'Santa Clara',
      country: 'USA',
      capacity: 68500,
      opened: 2014,
      description: 'Modern Silicon Valley stadium hosting World Cup 2026 matches in the San Francisco Bay Area. Home of the San Francisco 49ers.',
      sections: [
        { name: 'VIP Suite', seats: 1300, priceMultiplier: 4.2 },
        { name: 'Club Level', seats: 8000, priceMultiplier: 2.8 },
        { name: 'Lower Bowl', seats: 26000, priceMultiplier: 2.0 },
        { name: 'Upper Bowl', seats: 33200, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 11,
      name: 'Lumen Field',
      city: 'Seattle',
      country: 'USA',
      capacity: 68740,
      opened: 2002,
      description: 'Iconic open-air stadium hosting World Cup 2026 matches in Seattle. Home of the Seattle Seahawks & Sounders.',
      sections: [
        { name: 'VIP Suite', seats: 1100, priceMultiplier: 4.0 },
        { name: 'Club Level', seats: 7000, priceMultiplier: 2.8 },
        { name: 'Lower Bowl', seats: 28000, priceMultiplier: 2.0 },
        { name: 'Upper Bowl', seats: 32640, priceMultiplier: 1.0 }
      ]
    },

    // ===== FIFA WORLD CUP 2026 — MEXICO (3 stadiums) =====
    {
      id: 12,
      name: 'Estadio Akron',
      city: 'Zapopan',
      country: 'Mexico',
      capacity: 49325,
      opened: 2010,
      description: 'Modern stadium hosting World Cup 2026 matches in Guadalajara. Home of Club Deportivo Guadalajara (Chivas).',
      sections: [
        { name: 'VIP Palco', seats: 800, priceMultiplier: 3.5 },
        { name: 'Platea', seats: 12000, priceMultiplier: 2.0 },
        { name: 'Preferente', seats: 18000, priceMultiplier: 1.5 },
        { name: 'General', seats: 18525, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 13,
      name: 'Estadio Azteca',
      city: 'Mexico City',
      country: 'Mexico',
      capacity: 87523,
      opened: 1966,
      description: "Legendary stadium hosting its third World Cup. The most iconic stadium in Mexico, home to Club América and Mexico's national team.",
      sections: [
        { name: 'VIP Palco', seats: 600, priceMultiplier: 3.5 },
        { name: 'Platea', seats: 19250, priceMultiplier: 2.0 },
        { name: 'Preferente', seats: 24000, priceMultiplier: 1.5 },
        { name: 'General', seats: 30000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 14,
      name: 'Estadio BBVA',
      city: 'Guadalupe',
      country: 'Mexico',
      capacity: 53500,
      opened: 2015,
      description: 'State-of-the-art stadium hosting World Cup 2026 matches in Monterrey. Home of CF Monterrey (Rayados).',
      sections: [
        { name: 'VIP Suite', seats: 900, priceMultiplier: 3.5 },
        { name: 'Platea', seats: 13000, priceMultiplier: 2.0 },
        { name: 'Preferente', seats: 20000, priceMultiplier: 1.5 },
        { name: 'General', seats: 19600, priceMultiplier: 1.0 }
      ]
    },

    // ===== FIFA WORLD CUP 2026 — CANADA (2 stadiums) =====
    {
      id: 15,
      name: 'BC Place Stadium',
      city: 'Vancouver',
      country: 'Canada',
      capacity: 54500,
      opened: 1983,
      description: "Canada's premier stadium hosting World Cup 2026 matches. Home of the Vancouver Whitecaps and BC Lions.",
      sections: [
        { name: 'VIP Skybox', seats: 360, priceMultiplier: 3.5 },
        { name: 'Lower Bowl', seats: 13500, priceMultiplier: 2.0 },
        { name: 'Upper Bowl', seats: 20000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 16,
      name: 'BMO Field',
      city: 'Toronto',
      country: 'Canada',
      capacity: 30000,
      opened: 2007,
      description: 'Major Canadian stadium hosting World Cup 2026 matches. Home of Toronto FC and Toronto Argonauts.',
      sections: [
        { name: 'VIP', seats: 250, priceMultiplier: 3.0 },
        { name: 'Main Stand', seats: 10000, priceMultiplier: 1.8 },
        { name: 'General Admission', seats: 13500, priceMultiplier: 1.0 }
      ]
    },

    // ===== ALBANIA NATIONAL STADIUMS =====
    {
      id: 17,
      name: 'National Stadium (Air Albania Stadium)',
      city: 'Tirana',
      country: 'Albania',
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
      id: 18,
      name: 'Loro Boriçi Stadium',
      city: 'Shkodër',
      country: 'Albania',
      capacity: 16000,
      opened: 1953,
      description: 'Historic stadium in northern Albania, home to KF Vllaznia.',
      sections: [
        { name: 'VIP', seats: 600, priceMultiplier: 2.5 },
        { name: 'Main Stand', seats: 4500, priceMultiplier: 1.3 },
        { name: 'East Side', seats: 4000, priceMultiplier: 1.0 },
        { name: 'North Side', seats: 3000, priceMultiplier: 0.8 }
      ]
    },
    {
      id: 19,
      name: 'Selman Stërmasi Stadium',
      city: 'Tirana',
      country: 'Albania',
      capacity: 9500,
      opened: 1956,
      description: 'Historic stadium, home to KF Tirana.',
      sections: [
        { name: 'VIP', seats: 400, priceMultiplier: 2.0 },
        { name: 'Main Stand', seats: 4110, priceMultiplier: 1.3 },
        { name: 'Away Stand', seats: 5000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 20,
      name: 'Partizani Stadium',
      city: 'Tirana',
      country: 'Albania',
      capacity: 8500,
      opened: 2018,
      description: 'Home stadium of FK Partizani Tirana.',
      sections: [
        { name: 'VIP', seats: 496, priceMultiplier: 2.5 },
        { name: 'North', seats: 3000, priceMultiplier: 1.2 },
        { name: 'South', seats: 5000, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 21,
      name: 'Skënderbeu Stadium',
      city: 'Korçë',
      country: 'Albania',
      capacity: 12000,
      opened: 1959,
      description: 'Home stadium of KF Skënderbeu Korçë.',
      sections: [
        { name: 'VIP', seats: 600, priceMultiplier: 2.0 },
        { name: 'East', seats: 4200, priceMultiplier: 1.2 },
        { name: 'West', seats: 7200, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 22,
      name: 'Gjirokastër Stadium',
      city: 'Gjirokastër',
      country: 'Albania',
      capacity: 8000,
      opened: 1970,
      description: 'Stadium in the historic city of Gjirokastër.',
      sections: [
        { name: 'VIP', seats: 240, priceMultiplier: 2.0 },
        { name: 'Main Stand', seats: 2400, priceMultiplier: 1.2 },
        { name: 'Open Stand', seats: 4500, priceMultiplier: 1.0 }
      ]
    },

    // ===== KOSOVA STADIUMS =====
    {
      id: 23,
      name: 'Fadil Vokrri Stadium',
      city: 'Prishtina',
      country: 'Kosova',
      capacity: 13500,
      opened: 1953,
      description: 'Home stadium of the Kosova national team and FC Prishtina.',
      sections: [
        { name: 'VIP', seats: 480, priceMultiplier: 2.5 },
        { name: 'West Stand', seats: 4000, priceMultiplier: 1.3 },
        { name: 'East Stand', seats: 4500, priceMultiplier: 1.0 },
        { name: 'North Stand', seats: 3000, priceMultiplier: 0.8 }
      ]
    },
    {
      id: 24,
      name: 'Mitrovica Stadium',
      city: 'Mitrovica',
      country: 'Kosova',
      capacity: 8500,
      opened: 1972,
      description: 'Stadium in northern Kosova, home to KF Trepça.',
      sections: [
        { name: 'Main Stand', seats: 1500, priceMultiplier: 1.5 },
        { name: 'East Stand', seats: 2400, priceMultiplier: 1.2 },
        { name: 'West Stand', seats: 3750, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 25,
      name: 'Ferizaj Stadium',
      city: 'Ferizaj',
      country: 'Kosova',
      capacity: 6000,
      opened: 1980,
      description: 'Home of KF Ferizaj.',
      sections: [
        { name: 'Main Stand', seats: 960, priceMultiplier: 1.3 },
        { name: 'Open Stand', seats: 2500, priceMultiplier: 1.0 }
      ]
    },
    {
      id: 26,
      name: 'Peja Stadium',
      city: 'Peja',
      country: 'Kosova',
      capacity: 7000,
      opened: 1978,
      description: 'Stadium in western Kosova, home of KF Besa Pejë.',
      sections: [
        { name: 'Main Stand', seats: 1260, priceMultiplier: 1.3 },
        { name: 'Open Stand', seats: 3080, priceMultiplier: 1.0 }
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
                <div>
                  <h3 style={styles.stadiumName}>{stadium.name}</h3>
                  <span style={styles.city}>{stadium.city}, {stadium.country}</span>
                </div>
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
                    <span style={styles.sectionSeats}>{section.seats.toLocaleString()} seats</span>
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
    display: 'inline-block',
    marginTop: '6px',
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