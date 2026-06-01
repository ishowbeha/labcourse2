import api from './api';

const API_BASE = '/football';

/**
 * Service to consume the backend's Football API endpoints
 * (which proxy data from api-football.com)
 */
export const getUpcomingFootballMatches = async (limit = 50) => {
  try {
    const response = await api.get(`${API_BASE}/upcoming?limit=${limit}`);
    // The axios interceptor already returns response.data
    return response.data || [];
  } catch (error) {
    console.error('Error fetching upcoming football matches:', error);
    return [];
  }
};

export const getLiveFootballMatches = async () => {
  try {
    const response = await api.get(`${API_BASE}/live`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching live football matches:', error);
    return [];
  }
};

export const getMatchesByTeam = async (teamName, limit = 10) => {
  try {
    const response = await api.get(`${API_BASE}/team/${encodeURIComponent(teamName)}?limit=${limit}`);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching matches for team ${teamName}:`, error);
    return [];
  }
};

export const getLeagueMatches = async (leagueId, season = 2026, limit = 20) => {
  try {
    const response = await api.get(`${API_BASE}/league/${leagueId}?season=${season}&limit=${limit}`);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching matches for league ${leagueId}:`, error);
    return [];
  }
};

export const getAvailableLeagues = async () => {
  try {
    const response = await api.get(`${API_BASE}/leagues`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching available leagues:', error);
    return [];
  }
};

export default {
  getUpcomingFootballMatches,
  getLiveFootballMatches,
  getMatchesByTeam,
  getLeagueMatches,
  getAvailableLeagues
};