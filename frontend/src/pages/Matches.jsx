import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MatchService from '../services/MatchService';
import FootballService from '../services/FootballService';
import Navbar from '../components/Navbar';
import { getFlagEmoji, getFlagUrl } from '../utils/flags';

const useResponsiveStyles = () => {
  const [screenSize, setScreenSize] = useState('desktop');
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 768) setScreenSize('mobile');
      else if (width <= 1024) setScreenSize('tablet');
      else setScreenSize('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return screenSize;
};

const Matches = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
  const [matches, setMatches] = useState([]);       // local DB matches
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});       // { competition?, wcGroup?, team? }
  const [activeTab, setActiveTab] = useState('all');
  const [liveMatches, setLiveMatches] = useState([]);
  const [apiMatches, setApiMatches] = useState([]);  // from football-data.org
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [apiAvailable, setApiAvailable] = useState(false);
  const [wcDropdownOpen, setWcDropdownOpen] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const wcGroups = ['All Groups', 'Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H', 'Group I', 'Group J', 'Group K', 'Group L'];

  // Fetch ALL data ONCE on mount (not on every filter change)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [avail, localData, liveData, upcomingData] = await Promise.all([
          FootballService.getAvailableLeagues().catch(() => []),
          MatchService.getAllMatches().catch(() => []),
          FootballService.getLiveFootballMatches().catch(() => []),
          FootballService.getUpcomingFootballMatches(50).catch(() => [])
        ]);
        setApiAvailable(avail && avail.length > 0);
        setMatches(localData || []);
        setLiveMatches(liveData || []);
        setApiMatches(upcomingData || []);
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
        setDataFetched(true);
      }
    };
    init();
  }, []); // Empty deps = run once

  const handleSync = async () => {
    try {
      setSyncing(true); setSyncMessage('');
      const result = await fetch('/api/football/sync', { method: 'POST' });
      const data = await result.json();
      setSyncMessage(data.message || 'Sync complete');
      // Re-fetch local matches after sync
      const localData = await MatchService.getAllMatches().catch(() => []);
      setMatches(localData || []);
    } catch (error) {
      setSyncMessage('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

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
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  // Pure filtering — runs instantly, no API calls
  const getDisplayMatches = () => {
    if (activeTab === 'local') return matches;
    if (activeTab === 'api') return apiMatches;
    if (activeTab === 'live') return liveMatches;

    const allMapped = [];
    const localKeys = new Set();

    matches.forEach(m => {
      allMapped.push({ ...m, _sortDate: m.matchDate || '', _groupId: '' });
      localKeys.add(`${m.homeTeam || ''}-${m.awayTeam || ''}`);
    });

    apiMatches.forEach(apiMatch => {
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
          _groupId: group
        });
      }
    });

    liveMatches.forEach(liveMatch => {
      const key = `${liveMatch.homeTeam?.name}-${liveMatch.awayTeam?.name}`;
      const existingIdx = allMapped.findIndex(m => `${m.homeTeam}-${m.awayTeam}` === key);
      const matchDate = liveMatch.date ? liveMatch.date.split('T')[0] : null;
      if (existingIdx >= 0) {
        allMapped[existingIdx] = { ...allMapped[existingIdx], status: 'LIVE', homeScore: liveMatch.goals?.home, awayScore: liveMatch.goals?.away, source: 'live' };
      } else {
        allMapped.push({
          id: `live-${liveMatch.id}`, homeTeam: liveMatch.homeTeam?.name || 'Home', awayTeam: liveMatch.awayTeam?.name || 'Away',
          matchDate, matchTime: liveMatch.date ? new Date(liveMatch.date).toTimeString().split(' ')[0].slice(0, 5) : null,
          competition: liveMatch.league?.name || 'Live Match', basePrice: null, stadiumName: liveMatch.venue || 'TBD',
          status: 'LIVE', source: 'live', homeScore: liveMatch.goals?.home, awayScore: liveMatch.goals?.away,
          _sortDate: matchDate || '', _groupId: ''
        });
      }
    });

    // Sort by date
    allMapped.sort((a, b) => {
      if (!a._sortDate) return 1; if (!b._sortDate) return -1;
      return a._sortDate.localeCompare(b._sortDate);
    });

    // Apply competition filter (local, no API call)
    const competitionFilter = filters.competition;
    if (competitionFilter) {
      let filtered = allMapped.filter(m => {
        const comp = (m.competition || '').toLowerCase();
        const filter = competitionFilter.toLowerCase();
        return comp.includes(filter) || comp.includes(filter.replace(/2026/g, '').trim());
      });

      // Apply group filter (instant!)
      if (filters.wcGroup && filters.wcGroup !== 'all') {
        const groupMatch = filters.wcGroup.match(/Group ([A-L])/i);
        if (groupMatch) {
          const groupLetter = groupMatch[1].toUpperCase();
          filtered = filtered.filter(m => {
            const g = (m._groupId || '').toUpperCase();
            return g.includes(`GROUP ${groupLetter}`) || g.includes(`GROUP_${groupLetter}`);
          });
        }
      }
      return filtered;
    }

    // Apply team filter (local)
    if (filters.team) {
      const teamSearch = filters.team.toLowerCase();
      return allMapped.filter(m => {
        const home = (m.homeTeam || '').toLowerCase();
        const away = (m.awayTeam || '').toLowerCase();
        return home.includes(teamSearch) || away.includes(teamSearch);
      });
    }

    return allMapped;
  };

  const isLive = (match) => match.status === 'LIVE' || match.status === 'live' || match.source === 'live';

  return (
    <div style={styles.container}>
      <Navbar />
      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        <div style={styles.header}>
          <h1>⚽ Upcoming Matches</h1>
          <p>Select a match to view available tickets and seat options</p>
          {syncMessage && <div style={styles.syncMessage}>{syncMessage}</div>}
        </div>

        <div style={styles.tabs}>
          <button style={{...styles.tab, ...(activeTab === 'all' ? styles.activeTab : {})}} onClick={() => setActiveTab('all')}>All Matches</button>
          <button style={{...styles.tab, ...(activeTab === 'local' ? styles.activeTab : {})}} onClick={() => setActiveTab('local')}>Stadium Matches</button>
          {apiAvailable && <>
            <button style={{...styles.tab, ...(activeTab === 'api' ? styles.activeTab : {}), backgroundColor: activeTab === 'api' ? '#3498db' : 'transparent'}} onClick={() => setActiveTab('api')}>🌍 Live Fixtures</button>
            <button style={{...styles.tab, ...(activeTab === 'live' ? styles.activeTab : {}), backgroundColor: activeTab === 'live' ? '#e74c3c' : 'transparent', color: activeTab === 'live' ? 'white' : '#e74c3c'}} onClick={() => setActiveTab('live')}>🔴 Live Now ({liveMatches.length})</button>
          </>}
        </div>

        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.filters : styles.filters}>
          <div style={styles.filterGroup}>
            <select
              style={styles.select}
              value={filters.competition || ''}
              onChange={(e) => {
                handleFilterChange('competition', e.target.value);
                handleFilterChange('wcGroup', undefined);
              }}
            >
              <option value="">All Competitions</option>
              <option value="FIFA World Cup 2026">⚽ FIFA World Cup 2026</option>
              <option value="European Championship">🏆 European Championship</option>
              <option value="UEFA Champions League">⭐ UEFA Champions League</option>
              <option value="UEFA Europa League">⭐ UEFA Europa League</option>
              <option value="UEFA Nations League">🏆 UEFA Nations League</option>
              <option value="Kategoria Superiore">🇦🇱 Kategoria Superiore</option>
              <option value="Football Superleague of Kosova">🇽🇰 Football Superleague of Kosova</option>
            </select>

            {filters.competition && filters.competition.toLowerCase().includes('world cup') && (
              <div style={styles.groupDropdownWrapper} onClick={(e) => { e.stopPropagation(); setWcDropdownOpen(!wcDropdownOpen); }}>
                <div style={{...styles.groupDropdownTrigger, backgroundColor: filters.wcGroup && filters.wcGroup !== 'all' ? '#2c3e50' : '#fff', color: filters.wcGroup && filters.wcGroup !== 'all' ? '#fff' : '#555'}}>
                  {filters.wcGroup && filters.wcGroup !== 'all' ? filters.wcGroup : '🌍 Select Group'}
                  <span style={{marginLeft: '8px'}}>▼</span>
                </div>
                {wcDropdownOpen && (
                  <div style={styles.groupDropdownMenu}>
                    {wcGroups.map(group => (
                      <div
                        key={group}
                        style={{...styles.groupDropdownItem, fontWeight: group === filters.wcGroup ? 'bold' : 'normal', backgroundColor: group === filters.wcGroup ? '#f0f0f0' : 'transparent'}}
                        onClick={() => {
                          handleFilterChange('wcGroup', group === 'All Groups' ? undefined : group);
                          setWcDropdownOpen(false);
                        }}
                      >
                        {group === 'All Groups' ? '🌍 All Groups' : `📋 ${group}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <input type="text" style={styles.input} placeholder="Search team..." value={filters.team || ''} onChange={(e) => handleFilterChange('team', e.target.value)} />
          <button style={styles.searchBtn} onClick={() => {/* already auto-filters */}}>Search</button>
          {apiAvailable && (
            <button style={styles.syncBtn} onClick={handleSync} disabled={syncing}>
              {syncing ? '⏳ Syncing...' : '🔄 Sync Fixtures'}
            </button>
          )}
        </div>

        {loading ? (
          <div style={styles.loading}><p>Loading matches...</p></div>
        ) : getDisplayMatches().length === 0 ? (
          <div style={styles.empty}>
            <p>No matches found</p>
            {apiAvailable && <p style={styles.emptyHint}>Try clicking "Sync Fixtures" to import live fixtures</p>}
          </div>
        ) : (
          <div style={screenSize === 'mobile' ? responsiveStyles.mobile.grid : screenSize === 'tablet' ? responsiveStyles.tablet.grid : styles.grid}>
            {getDisplayMatches().map(match => (
              <div key={match.id || `${match.homeTeam}-${match.awayTeam}`} style={{...styles.card, borderColor: isLive(match) ? '#e74c3c' : match.source === 'api-football' ? '#3498db' : '#e9ecef'}}>
                <div style={styles.matchHeader}>
                  <span style={styles.competition}>{match.competition || 'Match'}</span>
                  <div style={styles.headerRight}>
                    {isLive(match) && <span style={styles.liveBadge}>🔴 LIVE</span>}
                    {match.source === 'api-football' && !isLive(match) && <span style={styles.apiBadge}>🌍</span>}
                    <span style={styles.timeAgo}>{match.matchDate ? getRelativeTime(match.matchDate, match.matchTime) : 'TBD'}</span>
                  </div>
                </div>
                <div style={styles.teams}>
                  <span style={styles.team}>{getFlagEmoji(match.homeTeam)} {match.homeTeam}</span>
                  <span style={styles.vs}>{isLive(match) && match.homeScore !== null ? `${match.homeScore} - ${match.awayScore}` : 'VS'}</span>
                  <span style={styles.team}>{getFlagEmoji(match.awayTeam)} {match.awayTeam}</span>
                </div>
                <div style={styles.info}>
                  <p style={styles.infoItem}>📅 {match.matchDate ? formatDate(match.matchDate) : 'Date TBD'}{match.matchTime ? ` at ${match.matchTime}` : ''}</p>
                  <p style={styles.infoItem}>🏟️ {match.stadiumName || match.venue || 'TBD'}</p>
                </div>
                <div style={styles.footer}>
                  <span style={styles.price}>{match.basePrice ? `From €${match.basePrice}` : isLive(match) ? '🔴 Watch Live' : 'Check venue'}</span>
                  {!isLive(match) && match.basePrice ? (
                    <button style={styles.buyBtn} onClick={() => navigate(`/tickets?matchId=${match.id}`)}>Buy Tickets</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' },
  header: { textAlign: 'center', marginBottom: '20px' },
  syncMessage: { marginTop: '10px', padding: '8px 16px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '6px', fontSize: '14px', display: 'inline-block' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center', flexWrap: 'wrap' },
  tab: { padding: '8px 20px', border: '2px solid #ddd', borderRadius: '20px', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#555', transition: 'all 0.2s' },
  activeTab: { backgroundColor: '#2c3e50', color: 'white', borderColor: '#2c3e50' },
  filters: { display: 'flex', gap: '16px', marginBottom: '30px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' },
  filterGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' },
  select: { padding: '10px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minWidth: '220px' },
  input: { padding: '10px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minWidth: '180px' },
  searchBtn: { padding: '10px 24px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  syncBtn: { padding: '10px 24px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  groupDropdownWrapper: { position: 'relative', display: 'inline-block', cursor: 'pointer' },
  groupDropdownTrigger: { padding: '10px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  groupDropdownMenu: { position: 'absolute', top: '100%', left: 0, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, minWidth: '200px', maxHeight: '300px', overflowY: 'auto', marginTop: '4px' },
  groupDropdownItem: { padding: '10px 16px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #e9ecef', transition: 'transform 0.2s, box-shadow 0.2s' },
  matchHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  headerRight: { display: 'flex', gap: '8px', alignItems: 'center' },
  competition: { fontSize: '12px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px' },
  liveBadge: { fontSize: '11px', color: '#e74c3c', fontWeight: 'bold', animation: 'pulse 1.5s infinite' },
  apiBadge: { fontSize: '14px' },
  timeAgo: { fontSize: '12px', color: '#27ae60', fontWeight: '600' },
  teams: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  team: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' },
  vs: { fontSize: '16px', color: '#e74c3c', fontWeight: '800', minWidth: '50px', textAlign: 'center' },
  info: { marginBottom: '16px' },
  infoItem: { fontSize: '14px', color: '#7f8c8d', margin: '4px 0' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #eee' },
  price: { fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' },
  buyBtn: { padding: '10px 24px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '60px 20px', color: '#7f8c8d' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#7f8c8d' },
  emptyHint: { fontSize: '14px', marginTop: '8px', color: '#3498db' },
};

const responsiveStyles = {
  mobile: {
    main: { ...styles.main, padding: '20px 15px' },
    filters: { ...styles.filters, flexDirection: 'column', alignItems: 'stretch' },
    grid: { ...styles.grid, gridTemplateColumns: '1fr', gap: '16px' },
  },
  tablet: {
    main: { ...styles.main, padding: '30px 15px' },
    grid: { ...styles.grid, gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  }
};

export default Matches;