import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AdminNavbar from '../components/AdminNavbar';

const AdminCoupons = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: '', max_uses: '100' });

  useEffect(() => { if (!isAdmin()) { navigate('/home'); return; } fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try { const r = await api.get('/admin/coupons'); setCoupons(r?.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const createCoupon = async () => {
    try { await api.post('/admin/coupons', form); setShowForm(false); setForm({ code: '', description: '', discount_type: 'percentage', discount_value: '', max_uses: '100' }); fetchCoupons(); } catch (e) { try { const m = await e.response?.data?.message || e.message; alert('Error: ' + m); } catch(e2) { alert('Error creating coupon'); } }
  };

  const toggleCoupon = async (id) => {
    try { await api.patch(`/admin/coupons/${id}/toggle`); fetchCoupons(); } catch (e) { console.error('Toggle failed:', e.message); }
  };

  const deleteCoupon = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try { await api.delete(`/admin/coupons/${id}`); fetchCoupons(); } catch (e) { console.error('Delete failed:', e.message); }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AdminNavbar title="🎫 Coupon Management" subtitle="Create and manage discount codes" />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>All Coupons ({coupons.length})</h2>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '12px 24px', backgroundColor: showForm ? '#e74c3c' : '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
            {showForm ? '✕ Cancel' : '+ New Coupon'}
          </button>
        </div>

        {showForm && (
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px', color: '#2c3e50', fontSize: '18px' }}>Create Coupon</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>Code *</label>
                <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="SUMMER20" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>Type</label>
                <select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                  <option value="percentage">% Percentage</option>
                  <option value="fixed">€ Fixed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>Value *</label>
                <input type="number" step="0.01" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} placeholder="20" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>Max Uses</label>
                <input type="number" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="20% off summer matches" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={createCoupon} style={{ marginTop: '16px', padding: '12px 32px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>Create Coupon</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Loading...</div>
        ) : coupons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#95a5a6', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎫</div>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>No coupons yet</p>
            <p style={{ fontSize: '13px', margin: 0 }}>Create your first discount coupon to start promoting ticket sales.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <thead>
                <tr>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555', backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>Code</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555', backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>Discount</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555', backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>Used</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555', backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555', backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px' }}>
                      <strong style={{ fontFamily: 'monospace', fontSize: '16px', color: '#2c3e50' }}>{c.code}</strong>
                      {c.description && <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>{c.description}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, backgroundColor: c.discount_type === 'percentage' ? '#d1fae5' : '#e0e7ff', color: c.discount_type === 'percentage' ? '#047857' : '#4338ca' }}>
                        {c.discount_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value}`}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#555' }}>{c.used_count || 0}/{c.max_uses || 100}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span onClick={() => toggleCoupon(c.id)} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'inline-block', backgroundColor: c.is_active ? '#d1fae5' : '#fee2e2', color: c.is_active ? '#047857' : '#dc2626' }}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => toggleCoupon(c.id)} style={{ padding: '6px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, marginRight: '6px' }}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deleteCoupon(c.id)} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Delete</button>
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