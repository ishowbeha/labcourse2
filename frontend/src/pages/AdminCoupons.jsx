import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import useResponsiveStyles from '../hooks/useResponsiveStyles';

const AdminCoupons = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: '', max_uses: '100' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { if (!isAdmin()) { navigate('/home'); return; } fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try { const r = await api.get('/admin/coupons'); setCoupons(r.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const createCoupon = async () => {
    try { await api.post('/admin/coupons', form); setShowForm(false); setForm({ code: '', description: '', discount_type: 'percentage', discount_value: '', max_uses: '100' }); fetchCoupons(); } catch (e) { alert('Error: ' + (e.response?.data?.message || e.message)); }
  };

  const toggleCoupon = async (id) => {
    try { await api.patch(`/admin/coupons/${id}/toggle`); fetchCoupons(); } catch (e) { console.error(e); }
  };

  const deleteCoupon = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try { await api.delete(`/admin/coupons/${id}`); fetchCoupons(); } catch (e) { console.error(e); }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#2c3e50', color: 'white', padding: '20px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1 style={{ margin: 0, fontSize: '22px' }}>🎫 Coupon Management</h1><Link to="/admin" style={{ color: '#bdc3c7', textDecoration: 'none', fontSize: '14px' }}>← Back to Dashboard</Link></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: 600 }}>{user?.first_name} {user?.last_name}</span>
            <button onClick={() => { logout(); navigate('/login'); }} style={{ backgroundColor: 'transparent', border: '1px solid white', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>All Coupons ({coupons.length})</h2>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '12px 24px', backgroundColor: showForm ? '#e74c3c' : '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>{showForm ? '✕ Cancel' : '+ New Coupon'}</button>
        </div>

        {showForm && (
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px', color: '#2c3e50' }}>Create Coupon</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Code *</label>
                <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="SUMMER20" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Discount Type</label>
                <select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                  <option value="percentage">Percentage (%)</option><option value="fixed">Fixed (€)</option></select></div>
              <div><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Discount Value *</label>
                <input type="number" step="0.01" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} placeholder="20" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Max Uses</label>
                <input type="number" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="20% off summer matches" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
            </div>
            <button onClick={createCoupon} style={{ marginTop: '16px', padding: '12px 32px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>Create Coupon</button>
          </div>
        )}

        {loading ? <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Loading...</div> : coupons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#95a5a6', backgroundColor: 'white', borderRadius: '12px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎫</div>
            <p style={{ fontSize: '16px', fontWeight: 600 }}>No coupons yet</p>
            <p style={{ fontSize: '13px' }}>Create your first discount coupon to start promoting ticket sales.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#555' }}>Code</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#555' }}>Discount</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#555' }}>Used</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#555' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#555' }}>Actions</th>
              </tr></thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 16px' }}><strong style={{ fontFamily: 'monospace', fontSize: '15px', color: '#2c3e50' }}>{c.code}</strong>
                      {c.description && <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{c.description}</div>}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, backgroundColor: c.discount_type === 'percentage' ? '#d1fae5' : '#e0e7ff', color: c.discount_type === 'percentage' ? '#047857' : '#4338ca' }}>
                        {c.discount_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value}`}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{c.used_count || 0}/{c.max_uses || '∞'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span onClick={() => toggleCoupon(c.id)} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, backgroundColor: c.is_active ? '#d1fae5' : '#fee2e2', color: c.is_active ? '#047857' : '#dc2626' }}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => toggleCoupon(c.id)} style={{ padding: '6px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deleteCoupon(c.id)} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
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

export default AdminCoupons;