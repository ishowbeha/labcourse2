import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AdminNavbar from '../components/AdminNavbar';

const AdminReviews = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isAdmin()) { navigate('/home'); return; } fetchReviews(); }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try { const r = await api.get('/reviews/all'); setReviews(r.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const approveReview = async (id) => {
    try { await api.patch('/reviews/' + id + '/approve'); fetchReviews(); } catch (e) { console.error(e); }
  };

  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    try { await api.delete('/reviews/' + id + '/admin'); fetchReviews(); } catch (e) { console.error(e); }
  };

  const StarDisplay = ({ value }) => (
    <span style={{ fontSize: '20px' }}>
      {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= value ? '#f39c12' : '#ddd' }}>★</span>)}
    </span>
  );

  const approvedReviews = reviews.filter(r => r.is_approved);
  const pendingReviews = reviews.filter(r => !r.is_approved);
  const avgRating = approvedReviews.length ? (approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length).toFixed(1) : '0';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AdminNavbar title="⭐ Reviews Management" subtitle="Approve and moderate user reviews" />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px', padding: '20px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center', borderTop: '4px solid #3498db' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2c3e50' }}>{reviews.length}</div>
            <div style={{ fontSize: '13px', color: '#555' }}>Total Reviews</div>
          </div>
          <div style={{ flex: 1, minWidth: '150px', padding: '20px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center', borderTop: '4px solid #27ae60' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2c3e50' }}>{approvedReviews.length}</div>
            <div style={{ fontSize: '13px', color: '#555' }}>Approved</div>
          </div>
          <div style={{ flex: 1, minWidth: '150px', padding: '20px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center', borderTop: '4px solid #f39c12' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2c3e50' }}>{pendingReviews.length}</div>
            <div style={{ fontSize: '13px', color: '#555' }}>Pending</div>
          </div>
          <div style={{ flex: 1, minWidth: '150px', padding: '20px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center', borderTop: '4px solid #f39c12' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f39c12' }}>{avgRating}</div>
            <div style={{ fontSize: '13px', color: '#555' }}>Avg Rating</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Loading...</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>No reviews yet</p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555' }}>User</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555' }}>Rating</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555' }}>Comment</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555' }}>Date</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px' }}>
                      <strong style={{ color: '#2c3e50' }}>{r.first_name} {r.last_name}</strong>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{r.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}><StarDisplay value={r.rating} /></td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#555', maxWidth: '250px' }}>{r.comment || '\u2014'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: r.is_approved ? '#d1fae5' : '#fef3c7', color: r.is_approved ? '#047857' : '#92400e' }}>
                        {r.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {!r.is_approved && (
                        <button onClick={() => approveReview(r.id)} style={{ padding: '6px 12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, marginRight: '6px' }}>Approve</button>
                      )}
                      <button onClick={() => deleteReview(r.id)} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminReviews;