import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';
import AdvancedSearchBar from '../components/search/AdvancedSearchBar';

const AdminCoupons = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: '', max_uses: '100' });

  // Advanced search state
  const [searchText, setSearchText] = useState('');
  const [advFilters, setAdvFilters] = useState({});
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const couponSortOptions = [
    { value: 'code', label: 'Code (A–Z)' },
    { value: 'discount_value', label: 'Discount Value' },
    { value: 'used_count', label: 'Usage Count' },
  ];

  const couponFilterDefs = [
    { id: 'discount_type', label: 'Type', type: 'select', options: [
      { value: 'percentage', label: '% Percentage' },
      { value: 'fixed', label: '€ Fixed' },
    ]},
    { id: 'is_active', label: 'Status', type: 'select', options: [
      { value: '1', label: 'Active' },
      { value: '0', label: 'Inactive' },
    ]},
  ];

  const fetchCoupons = async () => {
    setLoading(true);
    try { const r = await api.get('/admin/coupons'); setCoupons(r?.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAdvFilterChange = (id, value) => setAdvFilters((prev) => ({ ...prev, [id]: value }));

  const handleAdvReset = () => {
    setSearchText('');
    setAdvFilters({});
    setSortField('');
    setSortDir('asc');
  };

  // Client-side filtered + sorted coupons
  const filteredCoupons = useMemo(() => {
    let list = [...coupons];
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((c) =>
        (c.code || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    }
    if (advFilters.discount_type) {
      list = list.filter((c) => c.discount_type === advFilters.discount_type);
    }
    if (advFilters.is_active !== '' && advFilters.is_active !== undefined) {
      list = list.filter((c) => String(c.is_active ? '1' : '0') === advFilters.is_active);
    }
    if (sortField) {
      list = [...list].sort((a, b) => {
        let aVal = sortField === 'code' ? (a.code || '').toLowerCase()
          : sortField === 'discount_value' ? Number(a.discount_value || 0)
          : sortField === 'used_count' ? Number(a.used_count || 0)
          : (a.code || '').toLowerCase();
        let bVal = sortField === 'code' ? (b.code || '').toLowerCase()
          : sortField === 'discount_value' ? Number(b.discount_value || 0)
          : sortField === 'used_count' ? Number(b.used_count || 0)
          : (b.code || '').toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [coupons, searchText, advFilters, sortField, sortDir]);

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

  useEffect(() => { if (!isAdmin()) { navigate('/home'); return; } fetchCoupons(); }, []);

  return (
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="🎫 Coupon Management" subtitle="Create and manage discount codes" />

      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 text-dark mb-0">All Coupons ({filteredCoupons.length}{filteredCoupons.length !== coupons.length ? ` / ${coupons.length}` : ''})</h2>
          <Button variant={showForm ? 'danger' : 'success'} onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ New Coupon'}
          </Button>
        </div>

        {/* Advanced Search Bar */}
        <div className="mb-4">
          <AdvancedSearchBar
            searchValue={searchText}
            onSearchChange={setSearchText}
            onSearch={() => {}}
            onReset={handleAdvReset}
            placeholder="Search by code or description…"
            filters={couponFilterDefs}
            filterValues={advFilters}
            onFilterChange={handleAdvFilterChange}
            sortOptions={couponSortOptions}
            sortValue={sortField}
            sortDir={sortDir}
            onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
            resultCount={filteredCoupons.length}
            totalCount={coupons.length}
          />
        </div>

        {showForm && (
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title className="h6 mb-3">Create Coupon</Card.Title>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Code *</Form.Label>
                    <Form.Control
                      value={form.code}
                      onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                      placeholder="SUMMER20"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Type</Form.Label>
                    <Form.Select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})}>
                      <option value="percentage">% Percentage</option>
                      <option value="fixed">€ Fixed</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Value *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={form.discount_value}
                      onChange={e => setForm({...form, discount_value: e.target.value})}
                      placeholder="20"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Max Uses</Form.Label>
                    <Form.Control
                      type="number"
                      value={form.max_uses}
                      onChange={e => setForm({...form, max_uses: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Description</Form.Label>
                    <Form.Control
                      value={form.description}
                      onChange={e => setForm({...form, description: e.target.value})}
                      placeholder="20% off summer matches"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button variant="primary" className="mt-3" onClick={createCoupon}>Create Coupon</Button>
            </Card.Body>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2 mb-0">Loading...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <Card className="shadow-sm text-center py-5">
            <Card.Body>
              <div className="display-4 mb-3">🎟️</div>
              <p className="fw-semibold mb-2">{coupons.length === 0 ? 'No coupons yet' : 'No coupons match your search'}</p>
              <p className="text-muted small mb-0">
                {coupons.length === 0
                  ? 'Create your first discount coupon to start promoting ticket sales.'
                  : <button className="btn btn-link p-0" onClick={handleAdvReset}>Reset filters</button>}
              </p>
            </Card.Body>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Used</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong className="font-monospace fs-6">{c.code}</strong>
                        {c.description && <div className="text-muted small">{c.description}</div>}
                      </td>
                      <td>
                        <Badge bg={c.discount_type === 'percentage' ? 'success' : 'primary'}>
                          {c.discount_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value}`}
                        </Badge>
                      </td>
                      <td className="text-muted">{c.used_count || 0}/{c.max_uses || 100}</td>
                      <td>
                        <Badge
                          bg={c.is_active ? 'success' : 'danger'}
                          role="button"
                          className="cursor-pointer"
                          onClick={() => toggleCoupon(c.id)}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <Button variant="warning" size="sm" className="me-1" onClick={() => toggleCoupon(c.id)}>
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => deleteCoupon(c.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default AdminCoupons;
