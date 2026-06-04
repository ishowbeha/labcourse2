import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useResponsiveStyles from '../hooks/useResponsiveStyles';
import Navbar from '../components/Navbar';
import MatchService from '../services/MatchService';
import OrderService from '../services/OrderService';
import api from '../services/api';
import { getFlagEmoji } from '../utils/flags';

const Tickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const screenSize = useResponsiveStyles();
  const matchId = searchParams.get('matchId');

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [lastOrderNum, setLastOrderNum] = useState('');

  const sections = [
    { id: 'vip-north', name: 'VIP North', price: 150, capacity: 50 },
    { id: 'vip-south', name: 'VIP South', price: 150, capacity: 50 },
    { id: 'east-stand', name: 'East Stand', price: 60, capacity: 200 },
    { id: 'west-stand', name: 'West Stand', price: 60, capacity: 200 },
    { id: 'north-stand', name: 'North Stand', price: 40, capacity: 300 },
    { id: 'south-stand', name: 'South Stand', price: 40, capacity: 300 },
  ];

  const paymentMethods = [
    { id: 'credit-card', name: 'Credit Card', icon: '💳' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️' },
    { id: 'bank-transfer', name: 'Bank Transfer', icon: '🏦' },
  ];

  useEffect(() => {
    if (!matchId) {
      setError('No match selected. Please go back and select a match.');
      setLoading(false);
      return;
    }
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      let matchData = await MatchService.getMatchById(matchId);
      
      if (!matchData && matchId.startsWith('api-')) {
        matchData = {
          id: matchId,
          homeTeam: 'Team',
          awayTeam: 'Team',
          competition: 'FIFA World Cup 2026',
          basePrice: 89,
          stadiumName: 'TBD',
          matchDate: null,
          matchTime: null
        };
      }
      
      setMatch(matchData);
    } catch (err) {
      setError('Failed to load match details.');
    } finally {
      setLoading(false);
    }
  };

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
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const selectedSectionData = sections.find(s => s.id === selectedSection);
      const totalPrice = selectedSectionData.price * selectedQuantity;
      const fees = Math.round(totalPrice * 0.05);
      const pmName = paymentMethods.find(p => p.id === paymentMethod)?.name || paymentMethod;
      const orderNumber = OrderService.generateOrderNumber();

      // Create order with unique timestamp-based ID to avoid collisions
      const order = {
        id: Date.now() + Math.random(),
        orderNumber,
        date: new Date().toISOString().split('T')[0],
        match: `${match?.homeTeam || ''} vs ${match?.awayTeam || ''}`,
        matchDate: match?.matchDate || 'TBD',
        tickets: selectedQuantity,
        seats: Array(selectedQuantity).fill(`${selectedSectionData.name}`),
        subtotal: totalPrice,
        fees: fees,
        total: totalPrice + fees,
        status: 'confirmed',
        paymentMethod: pmName,
        competition: match?.competition || 'Match',
        stadium: match?.stadiumName || 'TBD'
      };

      // Save to localStorage
      const saved = OrderService.saveOrder(order);
      if (!saved) {
        throw new Error('Failed to save order');
      }

      setLastOrderNum(orderNumber);

      // Log purchase activity (for activity logs in admin)
      try {
        await api.post('/logs/activity', {
          action: 'purchase',
          description: `Bought ticket for ${match?.homeTeam || ''} vs ${match?.awayTeam || ''}`,
          resourceType: 'ticket',
          resourceId: String(order.id),
          metadata: { match: `${match?.homeTeam || ''} vs ${match?.awayTeam || ''}`, quantity: selectedQuantity }
        });
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
      year: 'numeric' 
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

  if (!matchId) {
    return (
      <div style={styles.container}>
        <Navbar />
        <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : styles.main}>
          <div style={styles.emptyState}>
            <span style={{ fontSize: '48px' }}>🎫</span>
            <h2>No Match Selected</h2>
            <p>Please go to the matches page and click "Buy Tickets" on a match.</p>
            <button style={styles.backBtn} onClick={() => navigate('/matches')}>
              Browse Matches
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <Navbar />
        <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : styles.main}>
          <div style={styles.loading}>Loading match details...</div>
        </main>
      </div>
    );
  }

  if (purchaseSuccess) {
    return (
      <div style={styles.container}>
        <Navbar />
        <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : styles.main}>
          <div style={styles.successContainer}>
            <span style={{ fontSize: '64px' }}>✅</span>
            <h1 style={styles.successTitle}>Payment Successful!</h1>
            <p style={styles.successText}>
              You have successfully purchased tickets for {match?.homeTeam} vs {match?.awayTeam}.
            </p>
            <div style={styles.successOrderInfo}>
              <p style={styles.successOrderNumber}>Order: {lastOrderNum}</p>
              <p style={styles.successDetails}>
                Tickets: {selectedQuantity} | €{selectedQuantity * (sections.find(s => s.id === selectedSection)?.price || 0) + Math.round(selectedQuantity * (sections.find(s => s.id === selectedSection)?.price || 0) * 0.05)}
              </p>
              <p style={styles.successPayment}>Paid via: {paymentMethods.find(p => p.id === paymentMethod)?.name || paymentMethod}</p>
            </div>
            <div style={styles.successActions}>
              <button style={styles.backBtn} onClick={() => navigate('/orders')}>
                View My Orders
              </button>
              <button style={styles.continueBtn} onClick={() => navigate('/matches')}>
                Browse More Matches
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const selectedSectionData = sections.find(s => s.id === selectedSection);
  const totalPrice = selectedSectionData ? selectedSectionData.price * selectedQuantity : 0;
  const fees = Math.round(totalPrice * 0.05);
  const grandTotal = totalPrice + fees;

  const steps = [
    { id: 1, label: 'Section & Quantity' },
    { id: 2, label: 'Payment Method' },
    { id: 3, label: 'Confirm & Pay' }
  ];

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : styles.main}>
        <div style={styles.header}>
          <h1>🎫 Buy Tickets</h1>
          <p>{match?.homeTeam} vs {match?.awayTeam}</p>
        </div>

        <div style={styles.progressBar}>
          {steps.map(s => (
            <div key={s.id} style={styles.progressStep}>
              <div style={{
                ...styles.progressCircle,
                backgroundColor: step >= s.id ? '#2c3e50' : '#ddd',
                color: step >= s.id ? 'white' : '#999'
              }}>
                {s.id}
              </div>
              <span style={{
                ...styles.progressLabel,
                color: step >= s.id ? '#2c3e50' : '#999'
              }}>{s.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={styles.errorBanner}>{error}</div>
        )}

        {step === 1 && (
          <>
            <div style={styles.matchCard}>
              <div style={styles.matchTeams}>
                <span style={styles.team}>{getFlagEmoji(match?.homeTeam)} {match?.homeTeam}</span>
                <span style={styles.vs}>VS</span>
                <span style={styles.team}>{getFlagEmoji(match?.awayTeam)} {match?.awayTeam}</span>
              </div>
              <div style={styles.matchInfo}>
                <p>📅 {formatDate(match?.matchDate)} {match?.matchTime ? `at ${match?.matchTime}` : ''}</p>
                <p>🏟️ {match?.stadiumName || 'TBD'}</p>
                <p>🏆 {match?.competition || 'Match'}</p>
              </div>
            </div>

            <div style={styles.sectionSection}>
              <h2 style={styles.sectionTitle}>Select Section</h2>
              <div style={styles.sectionGrid}>
                {sections.map(section => (
                  <div
                    key={section.id}
                    style={{
                      ...styles.sectionCard,
                      borderColor: selectedSection === section.id ? '#2c3e50' : '#e9ecef',
                      backgroundColor: selectedSection === section.id ? '#f0f4f8' : 'white',
                    }}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <span style={styles.sectionName}>{section.name}</span>
                    <span style={styles.sectionPrice}>€{section.price}</span>
                    <span style={styles.sectionCapacity}>{section.capacity} seats</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.quantitySection}>
              <h2 style={styles.sectionTitle}>Number of Tickets</h2>
              <div style={styles.quantityControls}>
                <button 
                  style={styles.qtyBtn} 
                  onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                >
                  −
                </button>
                <span style={styles.qtyValue}>{selectedQuantity}</span>
                <button 
                  style={styles.qtyBtn} 
                  onClick={() => setSelectedQuantity(Math.min(10, selectedQuantity + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <button 
              style={{ ...styles.nextBtn, opacity: !selectedSection ? 0.6 : 1 }}
              disabled={!selectedSection}
              onClick={() => setStep(2)}
            >
              Continue to Payment →
            </button>
          </>
        )}

        {step === 2 && (
          <div style={styles.paymentSection}>
            <h2 style={styles.sectionTitle}>Select Payment Method</h2>
            
            <div style={styles.paymentMethods}>
              {paymentMethods.map(pm => (
                <div
                  key={pm.id}
                  style={{
                    ...styles.paymentCard,
                    borderColor: paymentMethod === pm.id ? '#2c3e50' : '#e9ecef',
                    backgroundColor: paymentMethod === pm.id ? '#f0f4f8' : 'white',
                  }}
                  onClick={() => {
                    setPaymentMethod(pm.id);
                    if (pm.id !== 'credit-card') {
                      setCardNumber('');
                      setCardName('');
                      setCardExpiry('');
                      setCardCvc('');
                    }
                  }}
                >
                  <span style={styles.paymentIcon}>{pm.icon}</span>
                  <span style={styles.paymentName}>{pm.name}</span>
                  {paymentMethod === pm.id && <span style={styles.checkmark}>✓</span>}
                </div>
              ))}
            </div>

            {paymentMethod === 'credit-card' && (
              <div style={styles.cardForm}>
                <h3 style={styles.formTitle}>Card Details</h3>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Card Number</label>
                  <input style={styles.formInput} placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Cardholder Name</label>
                  <input style={styles.formInput} placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                </div>
                <div style={styles.formRow}>
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

            <div style={styles.navButtons}>
              <button style={styles.backBtnInline} onClick={() => setStep(1)}>← Back</button>
              <button 
                style={{ ...styles.nextBtn, opacity: !paymentMethod ? 0.6 : 1, flex: 1 }}
                disabled={!paymentMethod}
                onClick={() => setStep(3)}
              >
                Review Order →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={styles.summaryCard}>
            <h2 style={styles.sectionTitle}>Order Summary</h2>
            
            <div style={styles.summarySection}>
              <h4 style={styles.summarySubtitle}>🎫 Match</h4>
              <div style={styles.summaryRow}><span>{match?.homeTeam} vs {match?.awayTeam}</span></div>
              <div style={styles.summaryRow}><span style={{ color: '#7f8c8d' }}>{formatDate(match?.matchDate)}</span></div>
              <div style={styles.summaryRow}><span style={{ color: '#7f8c8d' }}>{match?.stadiumName || 'TBD'}</span></div>
            </div>

            <div style={styles.summarySection}>
              <h4 style={styles.summarySubtitle}>🪑 Seating</h4>
              {selectedSectionData && (
                <div style={styles.summaryRow}>
                  <span>{selectedSectionData.name}</span>
                  <span>€{selectedSectionData.price} × {selectedQuantity}</span>
                </div>
              )}
            </div>

            <div style={styles.summarySection}>
              <h4 style={styles.summarySubtitle}>💳 Payment</h4>
              <div style={styles.summaryRow}>
                <span>Method</span>
                <span>{paymentMethods.find(p => p.id === paymentMethod)?.icon} {paymentMethods.find(p => p.id === paymentMethod)?.name}</span>
              </div>
            </div>

            <div style={styles.priceBreakdown}>
              <div style={styles.summaryRow}><span>Subtotal</span><span>€{totalPrice}</span></div>
              <div style={styles.summaryRow}><span>Booking Fee (5%)</span><span>€{fees}</span></div>
              <div style={{ ...styles.summaryRow, ...styles.totalRow }}>
                <span>Total</span>
                <span>€{grandTotal}</span>
              </div>
            </div>

            <div style={styles.navButtons}>
              <button style={styles.backBtnInline} onClick={() => setStep(2)}>← Back</button>
              <button 
                style={{ ...styles.payBtn, opacity: purchasing ? 0.6 : 1, flex: 1 }}
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing ? '⏳ Processing Payment...' : `✅ Pay €${grandTotal}`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  main: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px' },
  header: { textAlign: 'center', marginBottom: '30px' },
  loading: { textAlign: 'center', padding: '60px 20px', color: '#7f8c8d', fontSize: '18px' },
  emptyState: { textAlign: 'center', padding: '80px 20px', color: '#555' },
  errorBanner: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', textAlign: 'center' },
  backBtn: { padding: '12px 24px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '16px' },
  continueBtn: { padding: '12px 24px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '16px' },
  progressBar: { display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '30px', padding: '20px' },
  progressStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  progressCircle: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  progressLabel: { fontSize: '12px', fontWeight: '600', textAlign: 'center' },
  matchCard: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px' },
  matchTeams: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  team: { fontSize: '22px', fontWeight: 'bold', color: '#2c3e50' },
  vs: { fontSize: '18px', color: '#e74c3c', fontWeight: '800' },
  matchInfo: { textAlign: 'center', fontSize: '15px', color: '#7f8c8d', lineHeight: '1.8' },
  sectionSection: { marginBottom: '24px' },
  sectionTitle: { fontSize: '20px', color: '#2c3e50', marginBottom: '16px' },
  sectionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  sectionCard: { padding: '20px', borderRadius: '10px', border: '2px solid #e9ecef', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
  sectionName: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' },
  sectionPrice: { display: 'block', fontSize: '22px', fontWeight: 'bold', color: '#e74c3c', marginBottom: '4px' },
  sectionCapacity: { display: 'block', fontSize: '12px', color: '#95a5a6' },
  quantitySection: { marginBottom: '24px' },
  quantityControls: { display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', padding: '16px' },
  qtyBtn: { width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #2c3e50', backgroundColor: 'white', color: '#2c3e50', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', minWidth: '40px', textAlign: 'center' },
  paymentSection: { marginBottom: '24px' },
  paymentMethods: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  paymentCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '10px', border: '2px solid #e9ecef', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' },
  paymentIcon: { fontSize: '28px' },
  paymentName: { fontSize: '16px', fontWeight: '600', color: '#2c3e50' },
  checkmark: { position: 'absolute', right: '20px', fontSize: '20px', color: '#27ae60', fontWeight: 'bold' },
  cardForm: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px' },
  formTitle: { margin: '0 0 16px 0', fontSize: '16px', color: '#2c3e50' },
  formGroup: { marginBottom: '16px' },
  formLabel: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#2c3e50', marginBottom: '6px' },
  formInput: { width: '100%', padding: '12px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  formRow: { display: 'flex', gap: '16px' },
  navButtons: { display: 'flex', gap: '12px', marginTop: '20px' },
  backBtnInline: { padding: '14px 24px', backgroundColor: 'transparent', color: '#2c3e50', border: '2px solid #2c3e50', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  nextBtn: { width: '100%', padding: '16px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  payBtn: { padding: '16px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  summaryCard: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px' },
  summarySection: { marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #eee' },
  summarySubtitle: { margin: '0 0 12px 0', fontSize: '15px', color: '#2c3e50' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '15px', color: '#555' },
  priceBreakdown: { padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '10px', marginBottom: '20px' },
  totalRow: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', paddingTop: '12px', marginTop: '8px', borderTop: '2px solid #ddd' },
  successContainer: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  successTitle: { color: '#27ae60', marginTop: '20px' },
  successText: { fontSize: '16px', color: '#555', marginTop: '12px' },
  successOrderInfo: { marginTop: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' },
  successOrderNumber: { fontSize: '14px', color: '#7f8c8d', fontWeight: '600' },
  successDetails: { fontSize: '15px', color: '#2c3e50', fontWeight: '600', marginTop: '8px' },
  successPayment: { fontSize: '14px', color: '#27ae60', marginTop: '8px' },
  successActions: { display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' },
};

const responsiveStyles = {
  mobile: {
    main: { ...styles.main, padding: '20px 15px' },
    progressBar: { ...styles.progressBar, gap: '20px' },
    progressLabel: { fontSize: '10px' },
    formRow: { ...styles.formRow, flexDirection: 'column' },
  },
  tablet: {},
};

export default Tickets;