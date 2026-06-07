import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Alert, Badge, Spinner, Form } from 'react-bootstrap';
import LazyNavbar from '../components/layout/LazyNavbar';
import api from '../services/api';

const StarRating = ({ value, onChange }) => (
  <span className="fs-3">
    {[1, 2, 3, 4, 5].map((s) => (
      <span
        key={s}
        role={onChange ? 'button' : undefined}
        onClick={() => onChange?.(s)}
        className={onChange ? 'cursor-pointer' : ''}
        style={{ color: s <= (value || 0) ? '#f39c12' : '#ddd', marginRight: '2px', cursor: onChange ? 'pointer' : 'default' }}
      >
        {s <= (value || 0) ? '★' : '☆'}
      </span>
    ))}
  </span>
);

const ratingLabel = (rating) => {
  if (rating === 1) return 'Poor';
  if (rating === 2) return 'Fair';
  if (rating === 3) return 'Good';
  if (rating === 4) return 'Very Good';
  return 'Excellent';
};

const MyReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [msg, setMsg] = useState('');
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    fetchReviews();
    fetchAvgRating();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const r = await api.get('/reviews/my');
      setReviews(r.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchAvgRating = async () => {
    try {
      const r = await api.get('/reviews/all');
      const data = r.data || [];
      const approved = data.filter((d) => d.is_approved);
      if (approved.length) {
        setAvgRating((approved.reduce((s, d) => s + d.rating, 0) / approved.length).toFixed(1));
      }
    } catch (e) {}
  };

  const submitReview = async () => {
    try {
      await api.post('/reviews', form);
      setMsg('✅ Review submitted! Awaiting admin approval.');
      setShowForm(false);
      setForm({ rating: 5, comment: '' });
      fetchReviews();
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.message || 'Error'}`);
    }
  };

  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      fetchReviews();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />
      <Container className="py-4 py-md-5" style={{ maxWidth: '800px' }}>
        <div className="text-center mb-4">
          <h1 className="h2 text-dark">⭐ Rate the System</h1>
          <p className="text-muted small mb-0">Help us improve! Share your experience with the platform.</p>
          {avgRating > 0 && (
            <p className="mt-2 mb-0 small">
              Average rating: <strong className="text-warning fs-5">{avgRating}</strong> / 5
            </p>
          )}
        </div>

        <div className="text-center mb-4">
          <Button
            variant={showForm ? 'danger' : 'primary'}
            size="lg"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Cancel' : '✍️ Write a Review'}
          </Button>
        </div>

        {msg && (
          <Alert variant={msg.includes('✅') ? 'success' : 'danger'} className="text-center">
            {msg}
          </Alert>
        )}

        {showForm && (
          <Card className="shadow-sm border-0 mb-4 text-center p-4">
            <h3 className="h5 mb-3">How would you rate this platform?</h3>
            <div className="mb-3">
              <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
              <div className="small text-muted mt-1">{ratingLabel(form.rating)}</div>
            </div>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Tell us what you think about the platform..."
              className="mb-3"
            />
            <Button variant="primary" size="lg" onClick={submitReview}>
              Submit Review
            </Button>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-5 text-muted">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading...
          </div>
        ) : reviews.length === 0 ? (
          <Card className="text-center shadow-sm border-0 p-5">
            <div className="display-4 mb-3">⭐</div>
            <h2 className="h4">No reviews yet</h2>
            <p className="text-muted mb-0">Be the first to rate the platform!</p>
          </Card>
        ) : (
          <div className="d-flex flex-column gap-3">
            {reviews.map((r) => (
              <Card
                key={r.id}
                className="shadow-sm border-0 text-center"
                style={{ borderLeft: `4px solid ${r.is_approved ? '#27ae60' : '#f39c12'}` }}
              >
                <Card.Body>
                  <StarRating value={r.rating} />
                  <div className="small text-muted mt-1">Your rating: <strong>{r.rating}/5</strong></div>
                  {r.comment && <p className="fst-italic text-secondary mt-2 mb-0">&quot;{r.comment}&quot;</p>}
                  <div className="d-flex justify-content-center gap-2 mt-3">
                    <Badge bg={r.is_approved ? 'success' : 'warning'} text={r.is_approved ? undefined : 'dark'}>
                      {r.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                    <Button variant="outline-danger" size="sm" onClick={() => deleteReview(r.id)}>
                      Delete
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
};

export default MyReviews;
