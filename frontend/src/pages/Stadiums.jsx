import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Modal, Form, Alert, Badge,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import LazyNavbar from '../components/layout/LazyNavbar';
import axios from 'axios';
import OrderService from '../services/OrderService';
import StripeCheckoutForm from '../components/payment/StripeCheckoutForm';
import AdvancedSearchBar from '../components/search/AdvancedSearchBar';

const Stadiums = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedStadium, setSelectedStadium] = useState(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [lastOrderNum, setLastOrderNum] = useState('');
  const [error, setError] = useState('');

  const SEASON_PASS_ORIGINAL = 299.99;
  const SEASON_PASS_DISCOUNT = 100.00;
  const SEASON_PASS_TOTAL = 199.99;

  // Advanced search state
  const [searchText, setSearchText] = useState('');
  const [advFilters, setAdvFilters] = useState({});
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const stadiumSortOptions = [
    { value: 'name', label: 'Name (A–Z)' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'opened', label: 'Year Opened' },
  ];

  const stadiumFilterDefs = [
    { id: 'country', label: 'Country', type: 'select', options: [
      { value: 'USA', label: '🇺🇸 USA' },
      { value: 'Mexico', label: '🇲🇽 Mexico' },
      { value: 'Canada', label: '🇨🇦 Canada' },
      { value: 'Albania', label: '🇦🇱 Albania' },
      { value: 'Kosova', label: '🇽🇰 Kosova' },
    ]},
    { id: 'capacityMin', label: 'Min Capacity', type: 'number', placeholder: '0', min: 0 },
    { id: 'capacityMax', label: 'Max Capacity', type: 'number', placeholder: '100000', min: 0 },
  ];

  // showMapModal / mapStadium removed — View on Map now opens Google Maps directly

  const handleViewMap = (stadium) => {
    if (stadium.mapsUrl) {
      window.open(stadium.mapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleBuyPass = (stadium) => {
    setSelectedStadium(stadium);
    setError('');
    setPurchaseSuccess(false);
    setShowPurchaseModal(true);
  };

  const handleSeasonPassPaymentSuccess = async (paymentIntent, finalAmount) => {
    if (!selectedStadium) return;

    setError('');

    try {
      const originalPrice = SEASON_PASS_ORIGINAL;
      const discountAmount = SEASON_PASS_DISCOUNT;
      const matchName = `Season Pass - ${selectedStadium.name}`;
      const sectionName = 'All Sections (1 Year)';
      const quantity = 1;

      const noteDetails = [
        'Season Stadium Pass',
        `Subtotal: ${originalPrice.toFixed(2)}`,
        'Fees: 0.00',
        `Discount: ${discountAmount.toFixed(2)}`,
        `Stripe PI: ${paymentIntent.id}`,
      ];
      const notesStr = noteDetails.join(' | ');

      let orderNumber = '';
      let apiPurchaseSucceeded = false;

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/orders/simple-purchase', {
          matchName,
          sectionName,
          quantity,
          totalAmount: finalAmount,
          paymentMethod: 'stripe',
          notes: notesStr,
          status: 'confirmed',
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        const data = response.data;
        if (data?.success && data?.data?.orderNumber) {
          orderNumber = data.data.orderNumber;
          apiPurchaseSucceeded = true;
        }
      } catch (apiErr) {
        console.warn('Backend simple-purchase failed for season pass:', apiErr);
      }

      if (!apiPurchaseSucceeded) {
        orderNumber = OrderService.generateOrderNumber();
      }

      OrderService.saveOrder({
        id: Date.now() + Math.random(),
        orderNumber,
        date: new Date().toISOString().split('T')[0],
        match: matchName,
        matchDate: new Date().toISOString().split('T')[0],
        matchTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
        stadium: selectedStadium.name,
        competition: 'Season Stadium Pass',
        tickets: quantity,
        seats: [sectionName],
        subtotal: originalPrice,
        fees: 0,
        discount: discountAmount,
        couponCode: null,
        total: finalAmount,
        status: 'confirmed',
        paymentMethod: 'Stripe',
        notes: notesStr,
      });

      try {
        const token = localStorage.getItem('token');
        await axios.post('/api/logs/activity', {
          action: 'purchase_pass',
          description: `Bought season stadium pass for ${selectedStadium.name}`,
          resourceType: 'pass',
          resourceId: orderNumber,
          metadata: { stadium: selectedStadium.name, paymentIntentId: paymentIntent.id },
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
      } catch (e) {}

      setLastOrderNum(orderNumber);
      setPurchaseSuccess(true);
    } catch (err) {
      console.error('Purchase season pass failed:', err);
      setError(err.message || 'Purchase failed. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAdvFilterChange = (id, value) => setAdvFilters((prev) => ({ ...prev, [id]: value }));

  const handleAdvReset = () => {
    setSearchText('');
    setAdvFilters({});
    setSortField('');
    setSortDir('asc');
  };

  // Complete stadium data — all 26 stadiums with real Google Maps URLs
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mercedes-Benz+Stadium+Atlanta+Georgia',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Gillette+Stadium+Foxborough+Massachusetts',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=AT%26T+Stadium+Arlington+Texas',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=NRG+Stadium+Houston+Texas',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Arrowhead+Stadium+Kansas+City+Missouri',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=SoFi+Stadium+Inglewood+California',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Hard+Rock+Stadium+Miami+Gardens+Florida',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=MetLife+Stadium+East+Rutherford+New+Jersey',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lincoln+Financial+Field+Philadelphia+Pennsylvania',
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
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Levi's+Stadium+Santa+Clara+California",
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lumen+Field+Seattle+Washington',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Estadio+Akron+Zapopan+Jalisco+Mexico',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Estadio+Azteca+Mexico+City',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Estadio+BBVA+Guadalupe+Nuevo+Leon+Mexico',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=BC+Place+Stadium+Vancouver+British+Columbia+Canada',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=BMO+Field+Toronto+Ontario+Canada',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Air+Albania+Stadium+Tirana',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Loro+Borici+Stadium+Shkoder+Albania',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Selman+Stermasi+Stadium+Tirana+Albania',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Partizani+Stadium+Tirana+Albania',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Skenderbeu+Stadium+Korce+Albania',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Shenkolli+Stadium+Gjirokaster+Albania',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fadil+Vokrri+Stadium+Pristina+Kosovo',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Trepca+Stadium+Mitrovica+Kosovo',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ferizaj+Stadium+Kosovo',
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
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Peja+Stadium+Pec+Kosovo',
      sections: [
        { name: 'Main Stand', seats: 1260, priceMultiplier: 1.3 },
        { name: 'Open Stand', seats: 3080, priceMultiplier: 1.0 }
      ]
    }
  ];

  // ── Derived filtered + sorted stadiums ──────────────────────────
  const filteredStadiums = useMemo(() => {
    let list = [...stadiums];
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    }
    if (advFilters.country) {
      list = list.filter((s) => s.country === advFilters.country);
    }
    if (advFilters.capacityMin !== '' && advFilters.capacityMin !== undefined) {
      list = list.filter((s) => s.capacity >= Number(advFilters.capacityMin));
    }
    if (advFilters.capacityMax !== '' && advFilters.capacityMax !== undefined) {
      list = list.filter((s) => s.capacity <= Number(advFilters.capacityMax));
    }
    if (sortField) {
      list = [...list].sort((a, b) => {
        let aVal = sortField === 'name' ? a.name.toLowerCase()
          : sortField === 'capacity' ? a.capacity
          : sortField === 'opened' ? a.opened
          : a.name.toLowerCase();
        let bVal = sortField === 'name' ? b.name.toLowerCase()
          : sortField === 'capacity' ? b.capacity
          : sortField === 'opened' ? b.opened
          : b.name.toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [stadiums, searchText, advFilters, sortField, sortDir]);

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />

      <Container className="py-4 py-md-5">
        <div className="text-center mb-3">
          <h1 className="h2">🏙️ Stadiums</h1>
          <p className="text-muted">Explore our partner stadiums and their seating arrangements</p>
        </div>

        {/* Advanced Search Bar */}
        <div className="mb-4">
          <AdvancedSearchBar
            searchValue={searchText}
            onSearchChange={setSearchText}
            onSearch={() => {}}
            onReset={handleAdvReset}
            placeholder="Search by name, city, country, or description…"
            filters={stadiumFilterDefs}
            filterValues={advFilters}
            onFilterChange={handleAdvFilterChange}
            sortOptions={stadiumSortOptions}
            sortValue={sortField}
            sortDir={sortDir}
            onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
            resultCount={filteredStadiums.length}
            totalCount={stadiums.length}
          />
        </div>

        <Row className="g-4">
          {filteredStadiums.length === 0 ? (
            <Col xs={12} className="text-center text-muted py-5">
              <div style={{ fontSize: 48 }}>🏙️</div>
              <p className="mt-3">No stadiums match your search. <button className="btn btn-link p-0" onClick={handleAdvReset}>Reset filters</button></p>
            </Col>
          ) : filteredStadiums.map(stadium => (
            <Col key={stadium.id} xs={12} md={6} xl={4}>
              <Card className="h-100 shadow-sm border-0 d-flex flex-column">
                <Card.Body className="d-flex flex-column">
                  <div className="mb-3">
                    <Card.Title className="h5">{stadium.name}</Card.Title>
                    <Badge bg="primary">{stadium.city}, {stadium.country}</Badge>
                  </div>

                  <Card.Text className="text-muted small">{stadium.description}</Card.Text>

                  <div className="d-flex gap-4 bg-light rounded p-3 mb-3">
                    <div>
                      <div className="small text-muted">Capacity</div>
                      <div className="fw-bold">{stadium.capacity.toLocaleString()} seats</div>
                    </div>
                    <div>
                      <div className="small text-muted">Opened</div>
                      <div className="fw-bold">{stadium.opened}</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="h6">Seating Sections</h4>
                    {stadium.sections.map((section, idx) => (
                      <div key={idx} className="d-flex justify-content-between py-2 border-bottom small">
                        <span className="fw-medium">{section.name}</span>
                        <span className="text-muted">{section.seats.toLocaleString()} seats</span>
                        <span className="text-success fw-semibold">x{section.priceMultiplier}</span>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex gap-2 mt-auto">
                    <Button
                      variant="outline-secondary"
                      className="flex-fill"
                      onClick={() => handleViewMap(stadium)}
                      title={`Open ${stadium.name} on Google Maps`}
                    >
                      🗺️ View on Map
                    </Button>
                    <Button variant="success" className="flex-fill" onClick={() => handleBuyPass(stadium)}>
                      🎟️ Buy Season Pass
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      <Modal show={showPurchaseModal && !!selectedStadium} onHide={() => setShowPurchaseModal(false)} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>🎫 Buy Season Stadium Pass</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStadium && !purchaseSuccess ? (
            <>
              <Alert variant="light" className="border">
                <Alert.Heading as="h6" className="mb-2">🏟️ Selected Stadium</Alert.Heading>
                <p className="fw-bold mb-1">{selectedStadium.name}</p>
                <p className="text-muted small mb-0">{selectedStadium.city}, {selectedStadium.country}</p>
              </Alert>

              <Alert variant="light" className="border">
                <Alert.Heading as="h6" className="mb-2">🎁 Season Pass Benefits</Alert.Heading>
                <ul className="small mb-0 ps-3">
                  <li>Access to all matches at {selectedStadium.name} for 1 year</li>
                  <li>Priority booking & reservation window</li>
                  <li>15% off official club merch & food inside stadium</li>
                  <li>Dedicated fast-track VIP entrance lanes</li>
                </ul>
              </Alert>

              {error && <Alert variant="danger">{error}</Alert>}

              <Card className="bg-light mb-4">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between small py-1">
                    <span>Original Price</span>
                    <span className="text-muted text-decoration-line-through">€{SEASON_PASS_ORIGINAL.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between small py-1 text-success">
                    <span>Season Pass Discount (33%)</span>
                    <span className="fw-bold">-€{SEASON_PASS_DISCOUNT.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 mt-2 border-top fw-bold">
                    <span>Total Price</span>
                    <span className="fs-5">€{SEASON_PASS_TOTAL.toFixed(2)}</span>
                  </div>
                </Card.Body>
              </Card>

              <StripeCheckoutForm
                amount={SEASON_PASS_TOTAL}
                metadata={{
                  product: 'season_stadium_pass',
                  stadium: selectedStadium.name,
                }}
                onSuccess={handleSeasonPassPaymentSuccess}
                onError={setError}
                payLabel={`🔒 Pay €${SEASON_PASS_TOTAL.toFixed(2)} with Stripe`}
              />
            </>
          ) : selectedStadium && purchaseSuccess ? (
            <div className="text-center py-3">
              <div className="display-3">✅</div>
              <h3 className="text-success mt-3">Season Pass Activated!</h3>
              <p className="text-muted small">
                Congratulations! You have successfully purchased a 1-Year Season Stadium Pass for <strong>{selectedStadium.name}</strong>.
              </p>
              <Alert variant="light" className="text-start small">
                <p className="mb-1 fw-semibold">Order Number: {lastOrderNum}</p>
                <p className="mb-0">Valid until: {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]}</p>
              </Alert>
              <div className="d-flex gap-2 justify-content-center flex-wrap">
                <Button variant="dark" onClick={() => { setShowPurchaseModal(false); navigate('/orders'); }}>View My Orders</Button>
                <Button variant="outline-secondary" onClick={() => { setShowPurchaseModal(false); setPurchaseSuccess(false); }}>Close</Button>
              </div>
            </div>
          ) : null}
        </Modal.Body>
        {selectedStadium && !purchaseSuccess && (
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowPurchaseModal(false)}>Cancel</Button>
          </Modal.Footer>
        )}
      </Modal>

      {/* Map modal removed — View on Map now opens Google Maps directly in a new tab */}
    </div>
  );
};

export default Stadiums;