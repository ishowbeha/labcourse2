import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Table, Badge, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';

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
    <span className="fs-5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={s <= value ? 'text-warning' : 'text-muted'}>★</span>
      ))}
    </span>
  );

  const approvedReviews = reviews.filter(r => r.is_approved);
  const pendingReviews = reviews.filter(r => !r.is_approved);
  const avgRating = approvedReviews.length ? (approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length).toFixed(1) : '0';

  const summaryStats = [
    { value: reviews.length, label: 'Total Reviews', borderClass: 'border-primary' },
    { value: approvedReviews.length, label: 'Approved', borderClass: 'border-success' },
    { value: pendingReviews.length, label: 'Pending', borderClass: 'border-warning' },
    { value: avgRating, label: 'Avg Rating', borderClass: 'border-warning', valueClass: 'text-warning' },
  ];

  return (
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="⭐ Reviews Management" subtitle="Approve and moderate user reviews" />

      <Container className="py-4">
        <Row className="g-3 mb-4">
          {summaryStats.map((stat, index) => (
            <Col key={index} xs={12} sm={6} lg={3}>
              <Card className={`h-100 shadow-sm border-top border-4 ${stat.borderClass}`}>
                <Card.Body className="text-center">
                  <div className={`fs-3 fw-bold ${stat.valueClass || 'text-dark'}`}>{stat.value}</div>
                  <div className="text-muted small">{stat.label}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2 mb-0">Loading...</p>
          </div>
        ) : reviews.length === 0 ? (
          <Card className="shadow-sm text-center py-5">
            <Card.Body>
              <div className="display-4 mb-3">⭐</div>
              <p className="fw-semibold mb-0">No reviews yet</p>
            </Card.Body>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>User</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(r => (
                    <tr key={r.id}>
                      <td>
                        <strong className="text-dark">{r.first_name} {r.last_name}</strong>
                        <div className="text-muted small">{r.email}</div>
                      </td>
                      <td><StarDisplay value={r.rating} /></td>
                      <td className="text-muted small">{r.comment || '\u2014'}</td>
                      <td>
                        <Badge bg={r.is_approved ? 'success' : 'warning'} text={r.is_approved ? undefined : 'dark'}>
                          {r.is_approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="text-muted small">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</td>
                      <td>
                        {!r.is_approved && (
                          <Button variant="success" size="sm" className="me-1" onClick={() => approveReview(r.id)}>Approve</Button>
                        )}
                        <Button variant="danger" size="sm" onClick={() => deleteReview(r.id)}>Delete</Button>
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

export default AdminReviews;
