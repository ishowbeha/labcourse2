import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Modal, Form, Alert, Badge,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import LazyNavbar from '../components/layout/LazyNavbar';
import axios from 'axios';
import OrderService from '../services/OrderService';

const Stadiums = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedStadium, setSelectedStadium] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [lastOrderNum, setLastOrderNum] = useState('');
  const [error, setError] = useState('');

  const [showMapModal, setShowMapModal] = useState(false);
  const [mapStadium, setMapStadium] = useState(null);

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const handleViewMap = (stadium) => {
    setMapStadium(stadium);
    setShowMapModal(true);
  };

  const handleBuyPass = (stadium) => {
    setSelectedStadium(stadium);
    setPaymentMethod('');
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCvc('');
    setError('');
    setPurchaseSuccess(false);
    setShowPurchaseModal(true);
  };

  const handleConfirmPurchase = async () => {
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
      const originalPrice = 299.99;
      const discountAmount = 100.00;
      const finalPrice = 199.99;
      const matchName = `Season Pass - ${selectedStadium.name}`;
      const sectionName = 'All Sections (1 Year)';
      const quantity = 1;
      const pmName = [
        { id: 'credit-card', name: 'Credit Card' },
        { id: 'paypal', name: 'PayPal' },
        { id: 'bank-transfer', name: 'Bank Transfer' }
      ].find(p => p.id === paymentMethod)?.name || paymentMethod;

      const noteDetails = [
        `Season Stadium Pass`,
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
          matchName: matchName,
          sectionName: sectionName,
          quantity: quantity,
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
        console.warn('Backend simple-purchase failed for season pass:', apiErr);
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
          action: 'purchase_pass',
          description: `Bought season stadium pass for ${selectedStadium.name}`,
          resourceType: 'pass',
          resourceId: orderNumber,
          metadata: { stadium: selectedStadium.name }
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        });
      } catch (e) {}

      setLastOrderNum(orderNumber);
      setPurchaseSuccess(true);
    } catch (err) {
      console.error('Purchase season pass failed:', err);
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

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

  const paymentMethods = [
    { id: 'credit-card', name: 'Credit Card', icon: '💳' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️' },
    { id: 'bank-transfer', name: 'Bank Transfer', icon: '🏦' },
  ];

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />

      <Container className="py-4 py-md-5">
        <div className="text-center mb-4">
          <h1 className="h2">🏟️ Stadiums</h1>
          <p className="text-muted">Explore our partner stadiums and their seating arrangements</p>
        </div>

        <Row className="g-4">
          {stadiums.map(stadium => (
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
                    <Button variant="outline-secondary" className="flex-fill" onClick={() => handleViewMap(stadium)}>
                      🗺️ View Map
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

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Select Payment Method</Form.Label>
                <div className="d-flex flex-column gap-2">
                  {paymentMethods.map(pm => (
                    <Card
                      key={pm.id}
                      className={`mb-0 ${paymentMethod === pm.id ? 'border-dark bg-light' : ''}`}
                      role="button"
                      onClick={() => setPaymentMethod(pm.id)}
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

              {paymentMethod === 'credit-card' && (
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

              <Card className="bg-light">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between small py-1">
                    <span>Original Price</span>
                    <span className="text-muted text-decoration-line-through">€299.99</span>
                  </div>
                  <div className="d-flex justify-content-between small py-1 text-success">
                    <span>Season Pass Discount (33%)</span>
                    <span className="fw-bold">-€100.00</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 mt-2 border-top fw-bold">
                    <span>Total Price</span>
                    <span className="fs-5">€199.99</span>
                  </div>
                </Card.Body>
              </Card>
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
            <Button variant="success" onClick={handleConfirmPurchase} disabled={purchasing || !paymentMethod}>
              {purchasing ? '⏳ Processing...' : '✅ Purchase Pass (€199.99)'}
            </Button>
          </Modal.Footer>
        )}
      </Modal>

      <Modal show={showMapModal && !!mapStadium} onHide={() => setShowMapModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>🗺️ {mapStadium?.name} - Location Map</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mapStadium && (
            <>
              <p className="fw-bold mb-1">{mapStadium.name}</p>
              <p className="text-muted small mb-3">Location: {mapStadium.city}, {mapStadium.country}</p>

              <div className="stadium-map-preview rounded border position-relative overflow-hidden d-flex align-items-center justify-content-center">
                <div className="text-center position-relative z-1">
                  <div className="display-4">🏟️</div>
                  <Badge bg="dark" className="px-3 py-2 mt-2">{mapStadium.name}</Badge>
                  <div className="map-marker-dot mx-auto mt-2" />
                </div>
                <Badge bg="light" text="dark" className="position-absolute bottom-0 end-0 m-2 font-monospace small">
                  Lat: {(30 + mapStadium.id * 1.5).toFixed(4)}°, Lon: {(-90 - mapStadium.id * 2.3).toFixed(4)}°
                </Badge>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={() => setShowMapModal(false)}>Close Map</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Stadiums;