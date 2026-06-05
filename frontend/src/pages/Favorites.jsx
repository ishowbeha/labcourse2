import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getFlagEmoji } from '../utils/flags';
import api from '../services/api';

const Favorites = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try { const r = await api.get('/admin/favorites'); setFavorites(r.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const removeFavorite = async (matchId) => {
    try {
      await api.post('/admin/favorites/toggle', { match_id: matchId });
      setFavorites(prev => prev.filter(f => f.match_id !== matchId));
    } catch (e) { console.error(e); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 8px', color: '#2c3e50' }}>⭐ My Favorite Matches</h1>
          <p style={{ margin: 0, color: '#7f8c8d' }}>Your saved matches — click the star on any match to add it here</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>Loading favorites...</div>
        ) : favorites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⭐</div>
            <h2 style={{ color: '#2c3e50', margin: '0 0 8px' }}>No favorites yet</h2>
            <p style={{ color: '#95a5a6', margin: '0 0 24px' }}>Browse matches and click the star to save your favorites</p>
            <button onClick={() => navigate('/matches')} style={{ padding: '12px 32px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
              Browse Matches
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {favorites.map(fav => (
              <div key={fav.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #f39c12' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saved Match</span>
                  <span style={{ color: '#f39c12', fontSize: '20px' }}>★</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{getFlagEmoji(fav.home_team)} {fav.home_team}</span>
                  <span style={{ fontSize: '14px', color: '#e74c3c', fontWeight: 800 }}>VS</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{getFlagEmoji(fav.away_team)} {fav.away_team}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '16px', lineHeight: '1.8' }}>
                  <p style={{ margin: 0 }}>📅 {fav.match_date ? formatDate(fav.match_date) : 'Date TBD'}{fav.match_time ? ` at ${fav.match_time}` : ''}</p>
                  <p style={{ margin: 0 }}>🏟️ {fav.stadium_name || 'TBD'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => navigate(`/tickets?matchId=${fav.match_id}`)} style={{ flex: 1, padding: '10px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                    Buy Tickets
                  </button>
                  <button onClick={() => removeFavorite(fav.match_id)} style={{ padding: '10px 16px', backgroundColor: 'transparent', color: '#e74c3c', border: '2px solid #e74c3c', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                    Remove ★
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;