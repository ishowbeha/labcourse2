import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const MyReviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [msg, setMsg] = useState('');
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => { fetchReviews(); fetchAvgRating(); }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try { const r = await api.get('/reviews/my'); setReviews(r.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchAvgRating = async () => {
    try { const r = await api.get('/reviews/all'); const data = r.data || []; const approved = data.filter(d => d.is_approved); if (approved.length) setAvgRating((approved.reduce((s, d) => s + d.rating, 0) / approved.length).toFixed(1)); } catch (e) {}
  };

  const submitReview = async () => {
    try {
      await api.post('/reviews', form);
      setMsg('✅ Review submitted! Awaiting admin approval.');
      setShowForm(false);
      setForm({ rating: 5, comment: '' });
      fetchReviews();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.message || 'Error')); }
  };

  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    try { await api.delete(`/reviews/${id}`); fetchReviews(); } catch (e) { console.error(e); }
  };

  const StarRating = ({ value, onChange }) => (
    <span style={{ fontSize: '28px', cursor: onChange ? 'pointer' : 'default' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} onClick={() => onChange?.(s)} style={{ color: s <= (value || 0) ? '#f39c12' : '#ddd', marginRight: '2px' }}>{s <= (value || 0) ? '★' : '☆'}</span>
      ))}
    </span>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 4px', color: '#2c3e50' }}>⭐ Rate the System</h1>
          <p style={{ margin: 0, color: '#7f8c8d', fontSize: '14px' }}>Help us improve! Share your experience with the platform.</p>
          {avgRating > 0 && <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#555' }}>Average rating: <strong style={{ color: '#f39c12', fontSize: '18px' }}>{avgRating}</strong> / 5</p>}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '14px 40px', backgroundColor: showForm ? '#e74c3c' : '#3498db', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>
            {showForm ? '✕ Cancel' : '✍️ Write a Review'}
          </button>
        </div>

        {msg && <div style={{ padding: '12px 16px', backgroundColor: msg.includes('✅') ? '#d1fae5' : '#fee2e2', color: msg.includes('✅') ? '#047857' : '#dc2626', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{msg}</div>}

        {showForm && (
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 16px', color: '#2c3e50', fontSize: '20px' }}>How would you rate this platform?</h3>
            <div style={{ marginBottom: '20px' }}>
              <StarRating value={form.rating} onChange={v => setForm({...form, rating: v})} />
              <div style={{ fontSize: '14px', color: '#7f8c8d', marginTop: '4px' }}>
                {form.rating === 1 ? 'Poor' : form.rating === 2 ? 'Fair' : form.rating === 3 ? 'Good' : form.rating === 4 ? 'Very Good' : 'Excellent'}
              </div>
            </div>
            <textarea value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} placeholder="Tell us what you think about the platform..." rows={3} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', marginBottom: '16px' }} />
            <button onClick={submitReview} style={{ padding: '14px 48px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '16px' }}>Submit Review</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Loading...</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
            <h2 style={{ color: '#2c3e50', margin: '0 0 8px' }}>No reviews yet</h2>
            <p style={{ color: '#95a5a6', margin: 0 }}>Be the first to rate the platform!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {reviews.map(r => (
              <div key={r.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid ${r.is_approved ? '#27ae60' : '#f39c12'}`, textAlign: 'center' }}>
                <StarRating value={r.rating} />
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#7f8c8d' }}>Your rating: <strong>{r.rating}/5</strong></div>
                {r.comment && <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#555', fontStyle: 'italic' }}>"{r.comment}"</p>}
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: r.is_approved ? '#d1fae5' : '#fef3c7', color: r.is_approved ? '#047857' : '#92400e' }}>
                    {r.is_approved ? 'Approved' : 'Pending'}
                  </span>
                  <button onClick={() => deleteReview(r.id)} style={{ padding: '4px 10px', backgroundColor: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyReviews;
