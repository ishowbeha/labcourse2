const axios = require('axios');

class FootballApiService {
  constructor() {
    this.apiKey = process.env.FOOTBALL_DATA_KEY || '';
    this.baseUrl = 'https://api.football-data.org/v4';
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: { 'X-Auth-Token': this.apiKey },
      timeout: 10000
    });
  }

  isConfigured() {
    return this.apiKey.length > 0;
  }

  getCompetitionCodes() {
    return {
      'World Cup': 'WC',
      'World Cup Qualifying UEFA': 'WCQ',
      'European Championship': 'EC',
      'UEFA Champions League': 'CL',
      'UEFA Europa League': 'EL',
    };
  }

  async getUpcomingMatches(code, limit = 20) {
    try {
      const response = await this.apiClient.get(`/competitions/${code}/matches`, {
        params: { status: 'SCHEDULED,POSTPONED', limit }
      });
      const matches = response.data.matches || [];
      return matches.map(m => this._transform(m));
    } catch (error) {
      if (error.response?.status === 404) return []; // Competition not found
      console.error(`❌ Error fetching matches for ${code}:`, error.message);
      return [];
    }
  }

  async getLiveMatches() {
    try {
      const response = await this.apiClient.get('/matches', {
        params: { status: 'LIVE,IN_PLAY,PAUSED' }
      });
      return (response.data.matches || []).map(m => this._transform(m, true));
    } catch (error) {
      console.error('❌ Error fetching live matches:', error.message);
      return [];
    }
  }

  async getMatchesByTeam(teamName, limit = 10) {
    try {
      const r = await this.apiClient.get('/teams', { params: { name: teamName } });
      const teams = r.data.teams || [];
      if (teams.length === 0) return [];
      const mr = await this.apiClient.get(`/teams/${teams[0].id}/matches`, {
        params: { status: 'SCHEDULED', limit }
      });
      return (mr.data.matches || []).map(m => this._transform(m));
    } catch (error) {
      console.error(`❌ Error fetching matches for ${teamName}:`, error.message);
      return [];
    }
  }

  async getAllUpcomingMatches(limit = 50) {
    const all = [];
    // World Cup first
    try {
      const wc = await this.getUpcomingMatches('WC', 20);
      all.push(...wc);
      console.log(`✅ Found ${wc.length} World Cup matches`);
    } catch (e) { /* no WC data yet */ }

    // Then other competitions
    const others = await Promise.allSettled(
      Object.entries(this.getCompetitionCodes())
        .filter(([_, c]) => c !== 'WC')
        .map(async ([name, code]) => {
          try {
            const m = await this.getUpcomingMatches(code, 10);
            return m;
          } catch { return []; }
        })
    );
    others.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });

    return all.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, limit);
  }

  _transform(match, isLive = false) {
    const h = match.homeTeam || {};
    const a = match.awayTeam || {};
    const s = match.score || {};
    const c = match.competition || {};
    const status = match.status || 'SCHEDULED';
    const statusMap = { 'SCHEDULED': 'SCHEDULED', 'TIMED': 'SCHEDULED', 'LIVE': 'LIVE', 'IN_PLAY': 'LIVE', 'PAUSED': 'LIVE', 'FINISHED': 'FT', 'POSTPONED': 'PST', 'CANCELLED': 'CAN', 'SUSPENDED': 'SUS' };

    return {
      id: match.id,
      date: match.utcDate,
      timestamp: match.utcDate ? new Date(match.utcDate).getTime() / 1000 : null,
      timezone: 'UTC',
      status: isLive ? 'LIVE' : statusMap[status] || 'SCHEDULED',
      statusLong: status,
      elapsed: null,
      round: match.matchday ? `Matchday ${match.matchday}` : match.stage || '',
      group: match.group || '',
      league: { id: c.id, name: c.name || '', country: c.area?.name || '', logo: c.emblem || '' },
      homeTeam: { id: h.id, name: h.name || 'Home', logo: h.crest || '', winner: s.winner === 'HOME_TEAM' },
      awayTeam: { id: a.id, name: a.name || 'Away', logo: a.crest || '', winner: s.winner === 'AWAY_TEAM' },
      score: { halftime: s.halfTime || {}, fulltime: s.fullTime || {}, extratime: s.extraTime || {}, penalty: s.penalty || {} },
      goals: { home: s.fullTime?.home ?? s.halfTime?.home ?? null, away: s.fullTime?.away ?? s.halfTime?.away ?? null },
      venue: match.venue || 'To Be Announced',
      city: match.area?.name || '',
      source: 'football-data'
    };
  }
}

module.exports = FootballApiService;