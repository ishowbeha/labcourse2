import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Form, Spinner, Alert, Dropdown, ButtonGroup,
} from 'react-bootstrap';
import MatchService from '../services/MatchService';
import FootballService from '../services/FootballService';
import LazyNavbar from '../components/layout/LazyNavbar';
import { getFlagUrl } from '../utils/flags';
import api from '../services/api';
import AdvancedSearchBar from '../components/search/AdvancedSearchBar';

const wcGroups = ['All Groups', 'Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H', 'Group I', 'Group J', 'Group K', 'Group L'];

const Matches = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [liveMatches, setLiveMatches] = useState([]);
  const [apiMatches, setApiMatches] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [apiAvailable, setApiAvailable] = useState(false);

  // Advanced search state
  const [searchText, setSearchText] = useState('');
  const [advFilters, setAdvFilters] = useState({});
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const matchSortOptions = [
    { value: 'date', label: 'Match Date' },
    { value: 'price', label: 'Ticket Price' },
    { value: 'competition', label: 'Competition' },
    { value: 'homeTeam', label: 'Home Team' },
  ];

  const matchFilterDefs = [
    { id: 'status', label: 'Status', type: 'select', options: [
      { value: 'LIVE', label: '🔴 Live' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'completed', label: 'Completed' },
    ]},
    { id: 'stadium', label: 'Stadium', type: 'text', placeholder: 'Search stadium…' },
    { id: 'dateFrom', label: 'Date From', type: 'date' },
    { id: 'dateTo', label: 'Date To', type: 'date' },
    { id: 'priceMin', label: 'Min Price (€)', type: 'number', placeholder: '0', min: 0 },
    { id: 'priceMax', label: 'Max Price (€)', type: 'number', placeholder: '500', min: 0 },
  ];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [avail, localData, liveData, upcomingData] = await Promise.all([
          FootballService.getAvailableLeagues().catch(() => []),
          MatchService.getAllMatches().catch(() => []),
          FootballService.getLiveFootballMatches().catch(() => []),
          FootballService.getUpcomingFootballMatches(50).catch(() => []),
        ]);
        setApiAvailable(avail && avail.length > 0);
        setMatches(localData || []);
        setLiveMatches(liveData || []);
        setApiMatches(upcomingData || []);
        try {
          const r = await api.get('/admin/favorites');
          setFavorites(r.data?.map((f) => f.match_id) || []);
        } catch (e) {}
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const toggleFavorite = async (matchId) => {
    try {
      const r = await api.post('/admin/favorites/toggle', { match_id: matchId });
      if (r.success) {
        const res = await api.get('/admin/favorites');
        setFavorites(res.data?.map((f) => f.match_id) || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage('');
      const result = await fetch('/api/football/sync', { method: 'POST' });
      const data = await result.json();
      setSyncMessage(data.message || 'Sync complete');
      const localData = await MatchService.getAllMatches().catch(() => []);
      setMatches(localData || []);
    } catch (error) {
      setSyncMessage(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getRelativeTime = (dateStr, timeStr) => {
    if (!dateStr) return 'TBD';
    const matchDate = new Date(`${dateStr}T${timeStr || '20:00'}`);
    const diffDays = Math.ceil((matchDate - new Date()) / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays) || diffDays < 0) return 'Upcoming';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
    if (diffDays < 365) return `In ${Math.floor(diffDays / 30)} months`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleAdvFilterChange = (id, value) => {
    setAdvFilters((prev) => ({ ...prev, [id]: value }));
  };

  const handleAdvSearch = () => {
    // search is triggered reactively via useMemo
  };

  const handleAdvReset = () => {
    setSearchText('');
    setAdvFilters({});
    setSortField('');
    setSortDir('asc');
    setFilters({});
  };

  const getRawMatches = () => {
    if (activeTab === 'local') return matches.map((m) => ({ ...m, _sortDate: m.matchDate || '', _groupId: '' }));
    if (activeTab === 'api') return apiMatches;
    if (activeTab === 'live') return liveMatches;

    const allMapped = [];
    const localKeys = new Set();

    matches.forEach((m) => {
      allMapped.push({ ...m, _sortDate: m.matchDate || '', _groupId: '' });
      localKeys.add(`${m.homeTeam || ''}-${m.awayTeam || ''}`);
    });

    apiMatches.forEach((apiMatch) => {
      const key = `${apiMatch.homeTeam?.name}-${apiMatch.awayTeam?.name}`;
      if (!localKeys.has(key)) {
        const compName = apiMatch.league?.name || '';
        const isWorldCup = compName === 'World Cup' || compName === 'WC' || compName?.includes('World Cup');
        const matchDate = apiMatch.date ? apiMatch.date.split('T')[0] : null;
        const group = apiMatch.group || '';
        allMapped.push({
          id: `api-${apiMatch.id}`,
          homeTeam: apiMatch.homeTeam?.name || 'Home',
          awayTeam: apiMatch.awayTeam?.name || 'Away',
          matchDate,
          matchTime: apiMatch.date ? new Date(apiMatch.date).toTimeString().split(' ')[0].slice(0, 5) : null,
          competition: isWorldCup ? 'FIFA World Cup 2026' : (compName || 'International'),
          basePrice: isWorldCup ? 89 : 25,
          stadiumName: apiMatch.venue || 'TBD',
          status: apiMatch.status || 'Scheduled',
          source: 'api-football',
          homeScore: apiMatch.goals?.home,
          awayScore: apiMatch.goals?.away,
          _sortDate: matchDate || '',
          _groupId: group,
        });
      }
    });

    liveMatches.forEach((liveMatch) => {
      const key = `${liveMatch.homeTeam?.name}-${liveMatch.awayTeam?.name}`;
      const existingIdx = allMapped.findIndex((m) => `${m.homeTeam}-${m.awayTeam}` === key);
      const matchDate = liveMatch.date ? liveMatch.date.split('T')[0] : null;
      if (existingIdx >= 0) {
        allMapped[existingIdx] = {
          ...allMapped[existingIdx],
          status: 'LIVE',
          homeScore: liveMatch.goals?.home,
          awayScore: liveMatch.goals?.away,
          source: 'live',
        };
      } else {
        allMapped.push({
          id: `live-${liveMatch.id}`,
          homeTeam: liveMatch.homeTeam?.name || 'Home',
          awayTeam: liveMatch.awayTeam?.name || 'Away',
          matchDate,
          matchTime: liveMatch.date ? new Date(liveMatch.date).toTimeString().split(' ')[0].slice(0, 5) : null,
          competition: liveMatch.league?.name || 'Live Match',
          basePrice: null,
          stadiumName: liveMatch.venue || 'TBD',
          status: 'LIVE',
          source: 'live',
          homeScore: liveMatch.goals?.home,
          awayScore: liveMatch.goals?.away,
          _sortDate: matchDate || '',
          _groupId: '',
        });
      }
    });

    return allMapped;
  };

  const getDisplayMatches = () => {
    let all = getRawMatches();

    // Legacy competition filter
    const competitionFilter = filters.competition;
    if (competitionFilter) {
      all = all.filter((m) => {
        const c = (m.competition || '').toLowerCase();
        const f = competitionFilter.toLowerCase();
        return c.includes(f) || c.includes(f.replace(/2026/g, '').trim());
      });
    }
    if (filters.wcGroup && filters.wcGroup !== 'all') {
      const groupMatch = filters.wcGroup.match(/Group ([A-L])/i);
      if (groupMatch) {
        const g = groupMatch[1].toUpperCase();
        all = all.filter((m) => {
          const gr = (m._groupId || '').toUpperCase();
          return gr.includes(`GROUP ${g}`) || gr.includes(`GROUP_${g}`);
        });
      }
    }
    if (filters.team) {
      const t = filters.team.toLowerCase();
      all = all.filter((m) => {
        const h = (m.homeTeam || '').toLowerCase();
        const a = (m.awayTeam || '').toLowerCase();
        return h.includes(t) || a.includes(t);
      });
    }

    // Advanced text search
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      all = all.filter((m) =>
        (m.homeTeam || '').toLowerCase().includes(q) ||
        (m.awayTeam || '').toLowerCase().includes(q) ||
        (m.competition || '').toLowerCase().includes(q) ||
        (m.stadiumName || '').toLowerCase().includes(q)
      );
    }

    // Advanced filters
    if (advFilters.status) {
      const s = advFilters.status.toLowerCase();
      all = all.filter((m) => (m.status || '').toLowerCase() === s || (s === 'live' && (m.source === 'live')));
    }
    if (advFilters.stadium) {
      const sv = advFilters.stadium.toLowerCase();
      all = all.filter((m) => (m.stadiumName || '').toLowerCase().includes(sv));
    }
    if (advFilters.dateFrom) {
      all = all.filter((m) => m.matchDate && m.matchDate >= advFilters.dateFrom);
    }
    if (advFilters.dateTo) {
      all = all.filter((m) => m.matchDate && m.matchDate <= advFilters.dateTo);
    }
    if (advFilters.priceMin !== '' && advFilters.priceMin !== undefined) {
      all = all.filter((m) => (m.basePrice || 0) >= Number(advFilters.priceMin));
    }
    if (advFilters.priceMax !== '' && advFilters.priceMax !== undefined) {
      all = all.filter((m) => (m.basePrice || 0) <= Number(advFilters.priceMax));
    }

    // Sort
    if (sortField) {
      all = [...all].sort((a, b) => {
        let aVal, bVal;
        if (sortField === 'date') { aVal = a.matchDate || ''; bVal = b.matchDate || ''; }
        else if (sortField === 'price') { aVal = a.basePrice || 0; bVal = b.basePrice || 0; }
        else if (sortField === 'competition') { aVal = (a.competition || '').toLowerCase(); bVal = (b.competition || '').toLowerCase(); }
        else if (sortField === 'homeTeam') { aVal = (a.homeTeam || '').toLowerCase(); bVal = (b.homeTeam || '').toLowerCase(); }
        else { aVal = a._sortDate || ''; bVal = b._sortDate || ''; }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: sort by date
      all.sort((a, b) => {
        if (!a._sortDate) return 1;
        if (!b._sortDate) return -1;
        return a._sortDate.localeCompare(b._sortDate);
      });
    }

    return all;
  };

  const isLive = (match) => match.status === 'LIVE' || match.status === 'live' || match.source === 'live';

  const getCardBorderClass = (match) => {
    if (isLive(match)) return 'border-danger';
    if (match.source === 'api-football') return 'border-primary';
    return '';
  };

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />
      <Container className="py-4 py-md-5">
        <div className="text-center mb-4">
          <h1 className="h2">⚽ Upcoming Matches</h1>
          <p className="text-muted">Select a match to view available tickets and seat options</p>
          {syncMessage && <Alert variant="success" className="d-inline-block mt-2 mb-0">{syncMessage}</Alert>}
        </div>

        <div className="d-flex justify-content-center flex-wrap gap-2 mb-4">
          <Button
            variant={activeTab === 'all' ? 'dark' : 'outline-secondary'}
            className="rounded-pill"
            onClick={() => setActiveTab('all')}
          >
            All Matches
          </Button>
          <Button
            variant={activeTab === 'local' ? 'dark' : 'outline-secondary'}
            className="rounded-pill"
            onClick={() => setActiveTab('local')}
          >
            Stadium Matches
          </Button>
        </div>

        {/* Competition quick-filter */}
        <div className="d-flex flex-wrap justify-content-center gap-3 mb-3 align-items-start">
          <div className="d-flex flex-wrap gap-2">
            <Form.Select
              value={filters.competition || ''}
              onChange={(e) => {
                handleFilterChange('competition', e.target.value);
                handleFilterChange('wcGroup', undefined);
              }}
              style={{ minWidth: '220px' }}
            >
              <option value="">All Competitions</option>
              <option value="FIFA World Cup 2026">⚽ FIFA World Cup 2026</option>
              <option value="European Championship">🏆 European Championship</option>
              <option value="UEFA Champions League">⭐ UEFA Champions League</option>
              <option value="UEFA Europa League">⭐ UEFA Europa League</option>
              <option value="UEFA Nations League">🏆 UEFA Nations League</option>
              <option value="Kategoria Superiore">🇦🇱 Kategoria Superiore</option>
              <option value="Football Superleague of Kosova">🇽🇰 Football Superleague of Kosova</option>
            </Form.Select>

            {filters.competition && filters.competition.toLowerCase().includes('world cup') && (
              <Dropdown>
                <Dropdown.Toggle
                  variant={filters.wcGroup && filters.wcGroup !== 'all' ? 'dark' : 'outline-secondary'}
                  style={{ minWidth: '180px' }}
                >
                  {filters.wcGroup && filters.wcGroup !== 'all' ? filters.wcGroup : '🌍 Select Group'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {wcGroups.map((group) => (
                    <Dropdown.Item
                      key={group}
                      active={group === filters.wcGroup}
                      onClick={() => handleFilterChange('wcGroup', group === 'All Groups' ? undefined : group)}
                    >
                      {group === 'All Groups' ? '🌍 All Groups' : `📋 ${group}`}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
          {apiAvailable && (
            <Button variant="success" onClick={handleSync} disabled={syncing}>
              {syncing ? '⏳ Syncing...' : '🔄 Sync Fixtures'}
            </Button>
          )}
        </div>

        {/* Advanced Search Bar */}
        <div className="mb-4">
          <AdvancedSearchBar
            searchValue={searchText}
            onSearchChange={setSearchText}
            onSearch={handleAdvSearch}
            onReset={handleAdvReset}
            placeholder="Search team, competition, or stadium…"
            filters={matchFilterDefs}
            filterValues={advFilters}
            onFilterChange={handleAdvFilterChange}
            sortOptions={matchSortOptions}
            sortValue={sortField}
            sortDir={sortDir}
            onSortChange={(field, dir) => { setSortField(field); setSortDir(dir); }}
            resultCount={getDisplayMatches().length}
            totalCount={getRawMatches().length}
          />
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">
            <Spinner animation="border" className="me-2" />
            Loading matches...
          </div>
        ) : getDisplayMatches().length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p className="mb-1">No matches found</p>
            {apiAvailable && <p className="small text-primary">Try clicking &quot;Sync Fixtures&quot; to import live fixtures</p>}
          </div>
        ) : (
          <Row className="g-4">
            {getDisplayMatches().map((match) => {
              const isApi = typeof match.id === 'string' && match.id.startsWith('api-');
              return (
                <Col key={match.id || `${match.homeTeam}-${match.awayTeam}`} xs={12} md={6} lg={4}>
                  <Card className={`h-100 shadow-sm border-2 ${getCardBorderClass(match)}`}>
                    <Card.Body>
                      <div className="d-flex justify-content-between mb-3">
                        <span className="small text-muted text-uppercase">{match.competition || 'Match'}</span>
                        <div className="d-flex gap-2 align-items-center">
                          {isLive(match) && <span className="small text-danger fw-bold">🔴 LIVE</span>}
                          {match.source === 'api-football' && !isLive(match) && <span>🌍</span>}
                          <span className="small text-success fw-semibold">
                            {match.matchDate ? getRelativeTime(match.matchDate, match.matchTime) : 'TBD'}
                          </span>
                        </div>
                      </div>

                      <div className="d-flex justify-content-center align-items-center gap-3 mb-3">
                        <span className="fw-bold d-flex align-items-center gap-1">
                          {getFlagUrl(match.homeTeam)
                            ? <img src={getFlagUrl(match.homeTeam)} alt={match.homeTeam} style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                            : <span style={{ fontSize: '1.2em' }}>🏳️</span>
                          }
                          {match.homeTeam}
                        </span>
                        <span className="text-danger fw-bold">
                          {isLive(match) && match.homeScore !== null ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                        </span>
                        <span className="fw-bold d-flex align-items-center gap-1">
                          {getFlagUrl(match.awayTeam)
                            ? <img src={getFlagUrl(match.awayTeam)} alt={match.awayTeam} style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                            : <span style={{ fontSize: '1.2em' }}>🏳️</span>
                          }
                          {match.awayTeam}
                        </span>
                      </div>

                      <div className="small text-muted mb-3">
                        <p className="mb-1">📅 {match.matchDate ? formatDate(match.matchDate) : 'Date TBD'}{match.matchTime ? ` at ${match.matchTime}` : ''}</p>
                        <p className="mb-0">🏟️ {match.stadiumName || match.venue || 'TBD'}</p>
                      </div>

                      <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            onClick={() => { if (!isApi) toggleFavorite(match.id); }}
                            className={`favorite-star ${isApi ? 'disabled' : ''}`}
                            style={{ color: favorites.includes(match.id) ? '#f39c12' : '#bbb' }}
                            title={favorites.includes(match.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {favorites.includes(match.id) ? '★' : '☆'}
                          </span>
                          <span className="fw-bold">
                            {match.basePrice ? `From €${match.basePrice}` : isLive(match) ? '🔴 Watch Live' : 'Check venue'}
                          </span>
                        </div>
                        {!isLive(match) && match.basePrice && (
                          <Button
                            variant="dark"
                            size="sm"
                            onClick={() => navigate(`/tickets?matchId=${match.id}`, { state: { match } })}
                          >
                            Buy Tickets
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </div>
  );
};

export default Matches;
