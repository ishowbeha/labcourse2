import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Form, Spinner, Badge, ProgressBar } from 'react-bootstrap';
import { useSettings } from '../context/SettingsContext';
import LazyNavbar from '../components/layout/LazyNavbar';
import OrderService from '../services/OrderService';
import axios from 'axios';
import { getFlagEmoji } from '../utils/flags';

// ─── Seat Availability Helpers ──────────────────────────────────────────────

/**
 * Deterministically generate a random number of taken seats for a section
 * based on matchId + sectionId so it stays stable across re-renders.
 * Returns a number between 1 and 10 (inclusive).
 */
const seedHash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const getTakenCount = (matchId, sectionId) => {
  const hash = seedHash(`${matchId}-${sectionId}`);
  return (hash % 10) + 1; // 1–10
};

/**
 * Generate a stable set of taken seat indices for a section.
 * Seat indices are 0-based within the reservable pool.
 */
const getTakenSeatIndices = (matchId, sectionId, reservableCount) => {
  const count = getTakenCount(matchId, sectionId);
  const hash = seedHash(`seats-${matchId}-${sectionId}`);
  const taken = new Set();
  let i = 0;
  while (taken.size < Math.min(count, reservableCount)) {
    const idx = seedHash(`${hash}-${i}`) % reservableCount;
    taken.add(idx);
    i++;
  }
  return taken;
};

// ─── Section Badge Colors ────────────────────────────────────────────────────
const getSectionStyle = (sectionId) => {
  if (sectionId.includes('vip')) return { badge: 'warning', ring: '#f39c12', bg: '#fff8e1', icon: '👑' };
  if (sectionId.includes('east') || sectionId.includes('west')) return { badge: 'primary', ring: '#3498db', bg: '#e8f4fd', icon: '⭐' };
  return { badge: 'secondary', ring: '#7f8c8d', bg: '#f0f0f0', icon: '🎟️' };
};

// ─── Seat Grid Component ─────────────────────────────────────────────────────
const SeatGrid = ({ matchId, section, selectedSeats, onToggleSeat }) => {
  const reservableCount = section.reservable;
  const takenSet = useMemo(
    () => getTakenSeatIndices(matchId, section.id, reservableCount),
    [matchId, section.id, reservableCount]
  );
  const takenCount = takenSet.size;
  const availableCount = reservableCount - takenCount;

  const seats = Array.from({ length: reservableCount }, (_, i) => {
    const isTaken = takenSet.has(i);
    const isSelected = selectedSeats.includes(i);
    return { idx: i, label: `${i + 1}`, taken: isTaken, selected: isSelected };
  });

  const cols = reservableCount <= 20 ? 5 : 10;

  return (
    <div>
      {/* Legend */}
      <div className="d-flex flex-wrap gap-3 justify-content-center mb-3">
        <span className="d-flex align-items-center gap-1 small">
          <span style={{ width: 14, height: 14, borderRadius: 3, background: '#27ae60', display: 'inline-block' }} />
          Available ({availableCount})
        </span>
        <span className="d-flex align-items-center gap-1 small">
          <span style={{ width: 14, height: 14, borderRadius: 3, background: '#e74c3c', display: 'inline-block' }} />
          Taken ({takenCount})
        </span>
        <span className="d-flex align-items-center gap-1 small">
          <span style={{ width: 14, height: 14, borderRadius: 3, background: '#8e44ad', display: 'inline-block' }} />
          Selected ({selectedSeats.length})
        </span>
      </div>

      {/* Seat grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 6,
          maxWidth: 360,
          margin: '0 auto',
        }}
      >
        {seats.map((seat) => {
          let bg = '#27ae60';
          let cursor = 'pointer';
          let title = `Seat ${seat.label} – Available`;
          if (seat.taken) {
            bg = '#e74c3c';
            cursor = 'not-allowed';
            title = `Seat ${seat.label} – Already Reserved`;
          } else if (seat.selected) {
            bg = '#8e44ad';
            title = `Seat ${seat.label} – Selected`;
          }

          return (
            <button
              key={seat.idx}
              title={title}
              disabled={seat.taken}
              onClick={() => !seat.taken && onToggleSeat(seat.idx)}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: 5,
                border: 'none',
                background: bg,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                cursor,
                transition: 'transform 0.1s, opacity 0.15s',
                opacity: seat.taken ? 0.55 : 1,
                transform: seat.selected ? 'scale(1.12)' : 'scale(1)',
              }}
            >
              {seat.label}
            </button>
          );
        })}
      </div>

      {/* Availability bar */}
      <div className="mt-3">
        <div className="d-flex justify-content-between small text-muted mb-1">
          <span>Availability</span>
          <span>{availableCount} / {reservableCount} seats free</span>
        </div>
        <ProgressBar
          now={Math.round((availableCount / reservableCount) * 100)}
          variant={availableCount < reservableCount * 0.3 ? 'danger' : availableCount < reservableCount * 0.6 ? 'warning' : 'success'}
          style={{ height: 6, borderRadius: 3 }}
        />
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const Tickets = () => {
  const { maxTicketsPerOrder } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get('matchId');

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]); // seat indices selected by user
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [lastOrderNum, setLastOrderNum] = useState('');
  const [finalPaidAmount, setFinalPaidAmount] = useState(0);
  const [showSeatPicker, setShowSeatPicker] = useState(false);

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

  const vipPrice = match ? getMatchVipPrice(match) : 150;

  // Sections sorted from HIGHEST price to LOWEST (VIP → Normal)
  // VIP sections: 20 reservable seats | Other sections: 50 reservable seats
  const sections = [
    { id: 'vip-north', name: 'VIP North', price: vipPrice, capacity: 500, reservable: 20, tier: 'vip' },
    { id: 'vip-south', name: 'VIP South', price: vipPrice, capacity: 500, reservable: 20, tier: 'vip' },
    { id: 'east-stand', name: 'East Stand', price: 60, capacity: 2000, reservable: 50, tier: 'premium' },
    { id: 'west-stand', name: 'West Stand', price: 60, capacity: 2000, reservable: 50, tier: 'premium' },
    { id: 'north-stand', name: 'North Stand', price: 40, capacity: 3000, reservable: 50, tier: 'standard' },
    { id: 'south-stand', name: 'South Stand', price: 40, capacity: 3000, reservable: 50, tier: 'standard' },
  ].sort((a, b) => b.price - a.price); // highest → lowest

  const paymentMethods = [
    { id: 'credit-card', name: 'Credit Card', icon: '💳' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️' },
    { id: 'bank-transfer', name: 'Bank Transfer', icon: '🏦' },
  ];

  // Clear selected seats when section changes
  useEffect(() => {
    setSelectedSeats([]);
    setShowSeatPicker(false);
  }, [selectedSection]);

  useEffect(() => {
    if (!matchId) {
      setError('No match selected. Please go back and select a match.');
      setLoading(false);
      return;
    }
    fetchMatch();
  }, [matchId]);

  const passedMatch = location.state?.match;

  const fetchMatch = async () => {
    try {
      let matchData = null;

      if (passedMatch) {
        matchData = {
          id: passedMatch.id,
          homeTeam: passedMatch.homeTeam || passedMatch.home_team,
          awayTeam: passedMatch.awayTeam || passedMatch.away_team,
          matchDate: passedMatch.matchDate || passedMatch.match_date,
          matchTime: passedMatch.matchTime || passedMatch.match_time,
          competition: passedMatch.competition,
          stadiumName: passedMatch.stadiumName || passedMatch.stadium_name || passedMatch.venue || 'TBD',
          basePrice: passedMatch.basePrice || passedMatch.base_price,
        };
      }

      if (!matchData) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`/api/matches/${matchId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            withCredentials: true,
          });
          const data = response.data;
          const m = data?.data || data;
          if (m) {
            matchData = {
              id: m.id,
              homeTeam: m.homeTeam || m.home_team,
              awayTeam: m.awayTeam || m.away_team,
              matchDate: m.matchDate || m.match_date,
              matchTime: m.matchTime || m.match_time,
              competition: m.competition,
              stadiumName: m.stadiumName || m.stadium_name,
              basePrice: m.basePrice || m.base_price,
            };
          }
        } catch (apiErr) {
          console.warn('Match fetch failed from API:', apiErr);
        }
      }

      if (!matchData) {
        matchData = {
          id: matchId,
          homeTeam: 'Team',
          awayTeam: 'Team',
          competition: 'FIFA World Cup 2026',
          basePrice: 89,
          stadiumName: 'TBD',
          matchDate: null,
          matchTime: null,
        };
      }

      setMatch(matchData);
    } catch (err) {
      setError('Failed to load match details.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle a seat in/out of selectedSeats, respecting quantity limit
  const handleToggleSeat = (seatIdx) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatIdx)) {
        return prev.filter((s) => s !== seatIdx);
      }
      if (prev.length >= selectedQuantity) {
        // Replace oldest selection with new one
        return [...prev.slice(1), seatIdx];
      }
      return [...prev, seatIdx];
    });
  };

  // When quantity changes, trim selected seats if needed
  useEffect(() => {
    setSelectedSeats((prev) => prev.slice(0, selectedQuantity));
  }, [selectedQuantity]);

  const handlePurchase = async () => {
    if (!selectedSection) {
      setError('Please select a section');
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
      const selectedSectionData = sections.find((s) => s.id === selectedSection);
      const totalPrice = selectedSectionData.price * selectedQuantity;
      const fees = Math.round(totalPrice * 0.05);
      const isFamilyPack =
        selectedQuantity === 4 &&
        selectedSectionData &&
        (selectedSectionData.id === 'vip-north' || selectedSectionData.id === 'vip-south');
      const familyDiscount = isFamilyPack ? totalPrice * 0.25 : 0;
      const discountAmount = couponDiscount;
      const grandTotalAfterDiscount = Math.max(0, totalPrice + fees - discountAmount - familyDiscount);
      const pmName = paymentMethods.find((p) => p.id === paymentMethod)?.name || paymentMethod;

      // Build seat labels from selected indices
      const seatLabels = selectedSeats.length > 0
        ? selectedSeats.map((i) => `${selectedSectionData.name} – Seat ${i + 1}`)
        : Array(selectedQuantity).fill(`${selectedSectionData.name}`);

      let orderNumber = '';
      let apiPurchaseSucceeded = false;

      const noteDetails = [];
      if (appliedCoupon?.code) noteDetails.push(`Coupon: ${appliedCoupon.code}`);
      if (familyDiscount > 0) noteDetails.push(`Family Pack Discount (25%)`);
      noteDetails.push(`Subtotal: ${totalPrice}`);
      noteDetails.push(`Fees: ${fees}`);
      noteDetails.push(`Discount: ${discountAmount + familyDiscount}`);
      if (selectedSeats.length > 0) noteDetails.push(`Seats: ${selectedSeats.map((i) => i + 1).join(', ')}`);
      const notesStr = noteDetails.join(' | ');

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          '/api/orders/simple-purchase',
          {
            matchName: `${match?.homeTeam || ''} vs ${match?.awayTeam || ''}`,
            sectionName: selectedSectionData?.name || selectedSection,
            quantity: selectedQuantity,
            totalAmount: grandTotalAfterDiscount,
            paymentMethod: paymentMethod,
            notes: notesStr,
            status: 'confirmed',
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            withCredentials: true,
          }
        );
        const data = response.data;
        if (data?.success && data?.data?.orderNumber) {
          orderNumber = data.data.orderNumber;
          apiPurchaseSucceeded = true;
        }
      } catch (apiErr) {
        console.warn('Backend simple-purchase failed:', apiErr);
      }

      if (!apiPurchaseSucceeded) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        orderNumber = OrderService.generateOrderNumber();
      }

      const order = {
        id: Date.now() + Math.random(),
        orderNumber,
        date: new Date().toISOString().split('T')[0],
        match: `${match?.homeTeam || ''} vs ${match?.awayTeam || ''}`,
        matchDate: match?.matchDate || 'TBD',
        matchTime: match?.matchTime || '',
        stadium: match?.stadiumName || 'TBD',
        competition: match?.competition || 'Match',
        tickets: selectedQuantity,
        seats: seatLabels,
        subtotal: totalPrice,
        fees: fees,
        discount: discountAmount + familyDiscount,
        couponCode: appliedCoupon?.code || null,
        total: grandTotalAfterDiscount,
        status: 'confirmed',
        paymentMethod: pmName,
        notes: notesStr,
      };
      OrderService.saveOrder(order);

      setLastOrderNum(orderNumber);
      setFinalPaidAmount(grandTotalAfterDiscount);

      try {
        const token = localStorage.getItem('token');
        await axios.post(
          '/api/logs/activity',
          {
            action: 'purchase',
            description: `Bought ticket for ${match?.homeTeam || ''} vs ${match?.awayTeam || ''}`,
            resourceType: 'ticket',
            resourceId: orderNumber,
            metadata: { match: `${match?.homeTeam || ''} vs ${match?.awayTeam || ''}`, quantity: selectedQuantity },
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            withCredentials: true,
          }
        );
      } catch (e) {}

      setPurchaseSuccess(true);
    } catch (err) {
      console.error('Purchase failed:', err);
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const pageWrapper = (content) => (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />
      <Container className="py-4 py-md-5">
        <Row className="justify-content-center">
          <Col lg={8} xl={7}>
            {content}
          </Col>
        </Row>
      </Container>
    </div>
  );

  if (!matchId) {
    return pageWrapper(
      <Card className="text-center shadow-sm border-0 p-4 p-md-5">
        <div className="display-3 mb-3">🎫</div>
        <h2 className="h4">No Match Selected</h2>
        <p className="text-muted mb-4">Please go to the matches page and click &quot;Buy Tickets&quot; on a match.</p>
        <Button variant="primary" size="lg" onClick={() => navigate('/matches')}>
          Browse Matches
        </Button>
      </Card>
    );
  }

  if (loading) {
    return pageWrapper(
      <div className="text-center py-5 text-muted">
        <Spinner animation="border" size="sm" className="me-2" />
        Loading match details...
      </div>
    );
  }

  if (purchaseSuccess) {
    const ssd = sections.find((s) => s.id === selectedSection);
    return pageWrapper(
      <Card className="text-center shadow-sm border-0 p-4 p-md-5">
        <div className="display-1 mb-3">✅</div>
        <h1 className="h2 text-success">Payment Successful!</h1>
        <p className="text-muted mt-3">
          You have successfully purchased tickets for {match?.homeTeam} vs {match?.awayTeam}.
        </p>
        <div className="bg-light rounded p-3 mt-4">
          <p className="small text-muted fw-semibold mb-1">Order: {lastOrderNum}</p>
          <p className="fw-semibold text-dark mb-1">
            Tickets: {selectedQuantity} | €{Number(finalPaidAmount).toFixed(2)}
          </p>
          {selectedSeats.length > 0 && (
            <p className="small text-muted mb-1">
              Seats: {selectedSeats.map((i) => `${ssd?.name} – Seat ${i + 1}`).join(', ')}
            </p>
          )}
          <p className="small text-success mb-0">
            Paid via: {paymentMethods.find((p) => p.id === paymentMethod)?.name || paymentMethod}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-3 justify-content-center mt-4">
          <Button variant="primary" size="lg" onClick={() => navigate('/orders')}>
            View My Orders
          </Button>
          <Button variant="info" size="lg" onClick={() => navigate('/matches')}>
            Browse More Matches
          </Button>
        </div>
      </Card>
    );
  }

  const selectedSectionData = sections.find((s) => s.id === selectedSection);
  const totalPrice = selectedSectionData ? selectedSectionData.price * selectedQuantity : 0;
  const isFamilyPack =
    selectedQuantity === 4 &&
    selectedSectionData &&
    (selectedSectionData.id === 'vip-north' || selectedSectionData.id === 'vip-south');
  const familyDiscount = isFamilyPack ? totalPrice * 0.25 : 0;
  const fees = Math.round(totalPrice * 0.05);
  const grandTotal = totalPrice + fees;

  const steps = [
    { id: 1, label: 'Section & Seats' },
    { id: 2, label: 'Payment Method' },
    { id: 3, label: 'Confirm & Pay' },
  ];

  // Get taken count for summary display
  const currentSectionTakenCount = selectedSectionData && matchId
    ? getTakenCount(matchId, selectedSectionData.id)
    : 0;

  return pageWrapper(
    <>
      <div className="text-center mb-4">
        <h1 className="h2 text-dark">🎫 Buy Tickets</h1>
        <p className="text-muted mb-0">
          {match?.homeTeam} vs {match?.awayTeam}
        </p>
      </div>

      {/* Step indicator */}
      <div className="d-flex justify-content-center gap-3 gap-md-5 mb-4 p-3">
        {steps.map((s) => (
          <div key={s.id} className="text-center">
            <Button
              variant={step >= s.id ? 'dark' : 'secondary'}
              className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center"
              disabled
              tabIndex={-1}
            >
              {s.id}
            </Button>
            <span className={`small fw-semibold ${step >= s.id ? 'text-dark' : 'text-muted'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {error && <Alert variant="danger" className="text-center">{error}</Alert>}

      {/* ── STEP 1: Section & Seat Selection ── */}
      {step === 1 && (
        <>
          {/* Match info card */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-center align-items-center gap-3 mb-3">
                <span className="fs-5 fw-bold">
                  {getFlagEmoji(match?.homeTeam)} {match?.homeTeam}
                </span>
                <span className="text-danger fw-bold">VS</span>
                <span className="fs-5 fw-bold">
                  {getFlagEmoji(match?.awayTeam)} {match?.awayTeam}
                </span>
              </div>
              <div className="text-muted">
                <p className="mb-1">📅 {formatDate(match?.matchDate)} {match?.matchTime ? `at ${match.matchTime}` : ''}</p>
                <p className="mb-1">🏟️ {match?.stadiumName || 'TBD'}</p>
                <p className="mb-0">🏆 {match?.competition || 'Match'}</p>
              </div>
            </Card.Body>
          </Card>

          {/* Section selection – sorted highest to lowest price */}
          <div className="mb-4">
            <h2 className="h5 text-dark mb-1">Select Section</h2>
            <p className="small text-muted mb-3">Sections are listed from highest to lowest price</p>
            <Row className="g-3">
              {sections.map((section) => {
                const style = getSectionStyle(section.id);
                const takenCount = matchId ? getTakenCount(matchId, section.id) : 0;
                const availableCount = section.reservable - takenCount;
                const isSelected = selectedSection === section.id;

                return (
                  <Col key={section.id} xs={12} sm={6} md={4}>
                    <Card
                      className={`text-center h-100 cursor-pointer position-relative`}
                      style={{
                        border: isSelected ? `2.5px solid ${style.ring}` : '1.5px solid #dee2e6',
                        background: isSelected ? style.bg : '#fff',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedSection(section.id)}
                      role="button"
                    >
                      {section.tier === 'vip' && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -10,
                            right: 10,
                            background: '#f39c12',
                            color: '#fff',
                            borderRadius: 20,
                            padding: '2px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 1,
                          }}
                        >
                          VIP
                        </div>
                      )}
                      <Card.Body className="py-3">
                        <div className="mb-1" style={{ fontSize: 22 }}>{style.icon}</div>
                        <div className="fw-bold small text-dark mb-1">{section.name}</div>
                        <div className="fs-5 fw-bold mb-1" style={{ color: style.ring }}>
                          €{section.price}
                        </div>
                        <div className="small text-muted mb-2">
                          <span className="text-success fw-semibold">{availableCount}</span>
                          <span> / {section.reservable} seats</span>
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 10,
                              background: takenCount > 0 ? '#fdecea' : '#e8f8f5',
                              color: takenCount > 0 ? '#c0392b' : '#1abc9c',
                            }}
                          >
                            🔴 {takenCount} reserved
                          </span>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>

          {/* Seat Picker (visible after selecting a section) */}
          {selectedSection && selectedSectionData && (
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 text-dark mb-0">
                    🪑 Seat Map — {selectedSectionData.name}
                  </h3>
                  <div className="d-flex gap-2 align-items-center">
                    <Badge bg="secondary" style={{ fontSize: 11 }}>
                      {selectedSectionData.reservable} online seats
                    </Badge>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setShowSeatPicker((v) => !v)}
                    >
                      {showSeatPicker ? '▲ Hide' : '▼ Choose Seats'}
                    </Button>
                  </div>
                </div>

                {showSeatPicker ? (
                  <SeatGrid
                    matchId={matchId}
                    section={selectedSectionData}
                    selectedSeats={selectedSeats}
                    onToggleSeat={handleToggleSeat}
                  />
                ) : (
                  <div className="text-center text-muted small py-2">
                    Click &ldquo;Choose Seats&rdquo; to pick your specific seats, or continue without picking.
                  </div>
                )}

                {selectedSeats.length > 0 && (
                  <div className="mt-3 p-2 rounded" style={{ background: '#f0e6ff', border: '1px solid #c39bd3' }}>
                    <p className="small mb-0 fw-semibold" style={{ color: '#6c3483' }}>
                      ✅ Selected seats:{' '}
                      {selectedSeats.map((i) => `Seat ${i + 1}`).join(', ')}
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Quantity */}
          <div className="mb-4">
            <h2 className="h5 text-dark mb-3">Number of Tickets</h2>
            <div className="d-flex align-items-center justify-content-center gap-3 p-3">
              <Button
                variant="outline-dark"
                size="lg"
                className="rounded-circle d-flex align-items-center justify-content-center p-0 lh-1"
                onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
              >
                −
              </Button>
              <span className="fs-3 fw-bold text-dark">{selectedQuantity}</span>
              <Button
                variant="outline-dark"
                size="lg"
                className="rounded-circle d-flex align-items-center justify-content-center p-0 lh-1"
                onClick={() => setSelectedQuantity(Math.min(maxTicketsPerOrder, selectedQuantity + 1))}
                disabled={selectedQuantity >= maxTicketsPerOrder}
              >
                +
              </Button>
            </div>
            <p className="text-center small text-muted mb-0">
              Max {maxTicketsPerOrder} ticket{maxTicketsPerOrder !== 1 ? 's' : ''} per order
            </p>
            {selectedSection && selectedSectionData && (
              <p className="text-center small text-muted mt-1">
                {selectedSeats.length} / {selectedQuantity} seat{selectedQuantity !== 1 ? 's' : ''} chosen
                {selectedSeats.length < selectedQuantity && (
                  <span className="text-warning"> — pick more or we'll assign automatically</span>
                )}
              </p>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-100"
            disabled={!selectedSection}
            onClick={() => setStep(2)}
          >
            Continue to Payment →
          </Button>
        </>
      )}

      {/* ── STEP 2: Payment Method ── */}
      {step === 2 && (
        <div className="mb-4">
          <h2 className="h5 text-dark mb-3">Select Payment Method</h2>

          <div className="d-flex flex-column gap-2 mb-4">
            {paymentMethods.map((pm) => (
              <Card
                key={pm.id}
                className={`${paymentMethod === pm.id ? 'border-primary border-2 bg-light' : 'border'} cursor-pointer`}
                onClick={() => {
                  setPaymentMethod(pm.id);
                  if (pm.id !== 'credit-card') {
                    setCardNumber('');
                    setCardName('');
                    setCardExpiry('');
                    setCardCvc('');
                  }
                }}
                role="button"
              >
                <Card.Body className="d-flex align-items-center gap-3 position-relative">
                  <span className="fs-3">{pm.icon}</span>
                  <span className="fw-semibold">{pm.name}</span>
                  {paymentMethod === pm.id && (
                    <span className="position-absolute end-0 me-3 text-success fw-bold fs-5">✓</span>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>

          {paymentMethod === 'credit-card' && (
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <h3 className="h6 text-dark mb-3">Card Details</h3>
                <Form.Group className="mb-3">
                  <Form.Label>Card Number</Form.Label>
                  <Form.Control
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Cardholder Name</Form.Label>
                  <Form.Control
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                </Form.Group>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Expiry Date</Form.Label>
                      <Form.Control
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>CVC</Form.Label>
                      <Form.Control
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          <div className="d-flex gap-2">
            <Button variant="outline-dark" onClick={() => setStep(1)}>← Back</Button>
            <Button
              variant="primary"
              className="flex-grow-1"
              disabled={!paymentMethod}
              onClick={() => setStep(3)}
            >
              Review Order →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Confirm & Pay ── */}
      {step === 3 && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Body>
            <h2 className="h5 text-dark mb-4">Order Summary</h2>

            <div className="border-bottom pb-3 mb-3">
              <h4 className="h6 text-dark mb-2">🎫 Match</h4>
              <div className="d-flex justify-content-between">{match?.homeTeam} vs {match?.awayTeam}</div>
              <div className="text-muted small">{formatDate(match?.matchDate)}</div>
              <div className="text-muted small">{match?.stadiumName || 'TBD'}</div>
            </div>

            <div className="border-bottom pb-3 mb-3">
              <h4 className="h6 text-dark mb-2">🪑 Seating</h4>
              {selectedSectionData && (
                <>
                  <div className="d-flex justify-content-between">
                    <span>{selectedSectionData.name}</span>
                    <span>€{selectedSectionData.price} × {selectedQuantity}</span>
                  </div>
                  {selectedSeats.length > 0 && (
                    <div className="text-muted small mt-1">
                      Seats: {selectedSeats.map((i) => `#${i + 1}`).join(', ')}
                    </div>
                  )}
                  <div className="text-muted small mt-1">
                    ℹ️ {currentSectionTakenCount} seat{currentSectionTakenCount !== 1 ? 's' : ''} already reserved in this section
                  </div>
                </>
              )}
            </div>

            <div className="border-bottom pb-3 mb-3">
              <h4 className="h6 text-dark mb-2">💳 Payment</h4>
              <div className="d-flex justify-content-between">
                <span>Method</span>
                <span>
                  {paymentMethods.find((p) => p.id === paymentMethod)?.icon}{' '}
                  {paymentMethods.find((p) => p.id === paymentMethod)?.name}
                </span>
              </div>
            </div>

            {/* Promo code */}
            <div className="bg-light rounded p-3 mb-4">
              <h4 className="h6 text-dark fw-semibold mb-2">🎟️ Promo Code</h4>
              <div className="d-flex gap-2">
                <Form.Control
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponMsg('');
                    setCouponDiscount(0);
                    setAppliedCoupon(null);
                  }}
                  placeholder="Enter code"
                  className="font-monospace"
                />
                <Button
                  variant={couponDiscount ? 'success' : 'primary'}
                  onClick={async () => {
                    if (!couponCode) return;
                    try {
                      const token = localStorage.getItem('token');
                      const rResponse = await axios.post(
                        '/api/admin/coupons/validate',
                        { code: couponCode, orderTotal: grandTotal - familyDiscount },
                        {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          withCredentials: true,
                        }
                      );
                      const r = rResponse.data;
                      if (r.success) {
                        setCouponDiscount(r.data.discount);
                        setAppliedCoupon(r.data);
                        setCouponMsg(`✅ ${r.data.description || 'Discount applied!'}`);
                      } else {
                        setCouponMsg('❌ ' + (r.message || 'Invalid code'));
                        setCouponDiscount(0);
                        setAppliedCoupon(null);
                      }
                    } catch (e) {
                      setCouponMsg('❌ Failed to validate');
                      setCouponDiscount(0);
                      setAppliedCoupon(null);
                    }
                  }}
                >
                  {appliedCoupon ? 'Applied' : 'Apply'}
                </Button>
              </div>
              {couponMsg && (
                <p className={`small mt-2 mb-0 ${couponMsg.includes('✅') ? 'text-success' : 'text-danger'}`}>
                  {couponMsg}
                </p>
              )}
            </div>

            {/* Price breakdown */}
            <div className="bg-light rounded p-3 mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>€{totalPrice}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Booking Fee (5%)</span>
                <span>€{fees}</span>
              </div>
              {familyDiscount > 0 && (
                <div className="d-flex justify-content-between text-success mb-2">
                  <span>Family Pack Discount (25%)</span>
                  <span className="fw-semibold">-€{Number(familyDiscount).toFixed(2)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="d-flex justify-content-between text-success mb-2">
                  <span>Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}</span>
                  <span className="fw-semibold">-€{Number(couponDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between fw-bold border-top pt-3 mt-2 fs-5">
                <span>Total</span>
                <span>€{Math.max(0, grandTotal - couponDiscount - familyDiscount).toFixed(2)}</span>
              </div>
            </div>

            <div className="d-flex gap-2">
              <Button variant="outline-dark" onClick={() => setStep(2)}>← Back</Button>
              <Button
                variant="success"
                className="flex-grow-1"
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing
                  ? '⏳ Processing Payment...'
                  : `✅ Pay €${Math.max(0, grandTotal - couponDiscount - familyDiscount).toFixed(2)}`}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default Tickets;
