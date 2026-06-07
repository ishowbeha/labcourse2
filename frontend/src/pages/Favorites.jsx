import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import LazyNavbar from '../components/layout/LazyNavbar';
import { getFlagEmoji } from '../utils/flags';
import api from '../services/api';

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/favorites');
      setFavorites(r.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const removeFavorite = async (matchId) => {
    try {
      await api.post('/admin/favorites/toggle', { match_id: matchId });
      setFavorites((prev) => prev.filter((f) => f.match_id !== matchId));
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />
      <Container className="py-4 py-md-5">
        <div className="text-center mb-4">
          <h1 className="h2 text-dark">⭐ My Favorite Matches</h1>
          <p className="text-muted mb-0">Your saved matches — click the star on any match to add it here</p>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading favorites...
          </div>
        ) : favorites.length === 0 ? (
          <Card className="text-center shadow-sm border-0 p-4 p-md-5">
            <div className="display-3 mb-3">⭐</div>
            <h2 className="h4 text-dark">No favorites yet</h2>
            <p className="text-muted mb-4">Browse matches and click the star to save your favorites</p>
            <Button variant="primary" size="lg" onClick={() => navigate('/matches')}>
              Browse Matches
            </Button>
          </Card>
        ) : (
          <Row className="g-4">
            {favorites.map((fav) => (
              <Col key={fav.id} xs={12} md={6} lg={4}>
                <Card className="h-100 shadow-sm border-warning border-2">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className="small text-muted text-uppercase">Saved Match</span>
                      <span className="text-warning fs-5">★</span>
                    </div>
                    <div className="d-flex justify-content-center align-items-center gap-3 mb-3">
                      <span className="fw-bold">{getFlagEmoji(fav.home_team)} {fav.home_team}</span>
                      <span className="text-danger fw-bold">VS</span>
                      <span className="fw-bold">{getFlagEmoji(fav.away_team)} {fav.away_team}</span>
                    </div>
                    <div className="small text-muted mb-3">
                      <p className="mb-1">📅 {fav.match_date ? formatDate(fav.match_date) : 'Date TBD'}{fav.match_time ? ` at ${fav.match_time}` : ''}</p>
                      <p className="mb-0">🏟️ {fav.stadium_name || 'TBD'}</p>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="dark"
                        className="flex-grow-1"
                        onClick={() => navigate(`/tickets?matchId=${fav.match_id}`)}
                      >
                        Buy Tickets
                      </Button>
                      <Button variant="outline-danger" onClick={() => removeFavorite(fav.match_id)}>
                        Remove ★
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
};

export default Favorites;
