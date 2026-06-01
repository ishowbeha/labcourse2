const axios = require('axios');

class FootballApiService {
  constructor() {
    this.apiKey = process.env.API_FOOTBALL_KEY || '';
    this.baseUrl = 'https://v3.football.api-sports.io';
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });
  }

  /**
   * Check if the API key is configured
   */
  isConfigured() {
    return this.apiKey.length > 0;
  }

  /**
   * Get the API-Football league ID for a given country/league name
   * Albania = 154, Kosova = 1100 (Kosovo Superliga)
   */
  getLeagueIds() {
    return {
      albania: 154,      // Albania - Kategoria Superiore
      kosovo: 1100,      // Kosovo - Superliga
      champions: 2,      // UEFA Champions League
      euro: 4,           // Euro Championship
      nations: 5,        // UEFA Nations League
      world: 1           // World Cup
    };
  }

  /**
   * Get upcoming matches for a specific league
   * @param {number} leagueId - API-Football league ID
   * @param {number} season - Season year (e.g. 2026)
   * @param {number} limit - Max results
   */
  async getUpcomingMatches(leagueId, season = 2026, limit = 20) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await this.apiClient.get('/fixtures', {
        params: {
          league: leagueId,
          season: season,
          dateFrom: today,
          status: 'NS-PST-FT',  // Not Started, Postponed, etc.
          timezone: 'Europe/Tirana'
        }
      });

      const fixtures = response.data.response || [];
      return fixtures.slice(0, limit).map(fixture => this._transformFixture(fixture));
    } catch (error) {
      console.error(`❌ Error fetching matches for league ${leagueId}:`, error.message);
      return [];
    }
  }

  /**
   * Get live matches
   */
  async getLiveMatches() {
    try {
      const response = await this.apiClient.get('/fixtures', {
        params: {
          live: 'all',
          timezone: 'Europe/Tirana'
        }
      });

      const fixtures = response.data.response || [];
      return fixtures.map(fixture => this._transformFixture(fixture, true));
    } catch (error) {
      console.error('❌ Error fetching live matches:', error.message);
      return [];
    }
  }

  /**
   * Search matches by team name
   * @param {string} teamName - Team name to search
   * @param {number} limit - Max results
   */
  async getMatchesByTeam(teamName, limit = 10) {
    try {
      // First, search for the team
      const teamResponse = await this.apiClient.get('/teams', {
        params: { search: teamName }
      });

      const teams = teamResponse.data.response || [];
      if (teams.length === 0) return [];

      const teamId = teams[0].team.id;
      const today = new Date().toISOString().split('T')[0];

      const response = await this.apiClient.get('/fixtures', {
        params: {
          team: teamId,
          dateFrom: today,
          season: 2026,
          timezone: 'Europe/Tirana'
        }
      });

      const fixtures = response.data.response || [];
      return fixtures.slice(0, limit).map(fixture => this._transformFixture(fixture));
    } catch (error) {
      console.error(`❌ Error fetching matches for team ${teamName}:`, error.message);
      return [];
    }
  }

  /**
   * Get matches for all relevant leagues (Albania, Kosovo, top European)
   */
  async getAllUpcomingMatches(limit = 50) {
    if (!this.isConfigured()) {
      console.warn('⚠️ API-Football key not configured. Returning empty results.');
      return [];
    }

    const leagues = this.getLeagueIds();
    const allMatches = [];

    // Fetch from multiple leagues
    const leaguePromises = Object.entries(leagues).map(async ([name, id]) => {
      const matches = await this.getUpcomingMatches(id, 2026, 15);
      return { league: name, matches };
    });

    const results = await Promise.allSettled(leaguePromises);
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allMatches.push(...result.value.matches);
      }
    });

    // Sort by date and limit
    return allMatches
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, limit);
  }

  /**
   * Transform API-Football fixture to a standardized format
   */
  _transformFixture(fixture, isLive = false) {
    const homeTeam = fixture.teams?.home || {};
    const awayTeam = fixture.teams?.away || {};
    const score = fixture.goals || {};
    const status = fixture.fixture?.status || {};
    const league = fixture.league || {};

    return {
      id: fixture.fixture?.id,
      date: fixture.fixture?.date,
      timestamp: fixture.fixture?.timestamp,
      timezone: fixture.fixture?.timezone,
      status: isLive ? 'LIVE' : status.short || 'Scheduled',
      statusLong: status.long || 'Not Started',
      elapsed: status.elapsed || null,  // minutes elapsed for live matches
      league: {
        id: league.id,
        name: league.name,
        country: league.country,
        logo: league.logo
      },
      homeTeam: {
        id: homeTeam.id,
        name: homeTeam.name,
        logo: homeTeam.logo,
        winner: homeTeam.winner
      },
      awayTeam: {
        id: awayTeam.id,
        name: awayTeam.name,
        logo: awayTeam.logo,
        winner: awayTeam.winner
      },
      score: {
        halftime: fixture.score?.halftime || {},
        fulltime: fixture.score?.fulltime || {},
        extratime: fixture.score?.extratime || {},
        penalty: fixture.score?.penalty || {}
      },
      goals: {
        home: score.home,
        away: score.away
      },
      venue: fixture.fixture?.venue?.name || 'TBD',
      source: 'api-football'
    };
  }
}

module.exports = FootballApiService;