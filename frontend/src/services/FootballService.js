import api from './api';

const API_BASE = '/football';

/**
 * Service to consume the backend's Football API endpoints
 * (which proxy data from TheSportsDB)
 *
 * Note: The axios interceptor in api.js already unwraps response.data,
 * so the response here is the full backend JSON body: { success, count, data }
 */

export const getUpcomingFootballMatches = async (limit = 50) => {
  try {
    const res = await api.get(`${API_BASE}/upcoming?limit=${limit}`);
    // res = { success: true, count: N, data: [...] }
    return res.data || [];
  } catch (error) {
    console.error('Error fetching upcoming football matches:', error);
    return [];
  }
};

export const getLiveFootballMatches = async () => {
  try {
    const res = await api.get(`${API_BASE}/live`);
    return res.data || [];
  } catch (error) {
    console.error('Error fetching live football matches:', error);
    return [];
  }
};

export const getMatchesByTeam = async (teamName, limit = 10) => {
  try {
    const res = await api.get(`${API_BASE}/team/${encodeURIComponent(teamName)}?limit=${limit}`);
    return res.data || [];
  } catch (error) {
    console.error(`Error fetching matches for team ${teamName}:`, error);
    return [];
  }
};

export const getCompetitionMatches = async (code, limit = 20) => {
  try {
    const res = await api.get(`${API_BASE}/competition/${code}?limit=${limit}`);
    return res.data || [];
  } catch (error) {
    console.error(`Error fetching matches for competition ${code}:`, error);
    return [];
  }
};

export const getAvailableCompetitions = async () => {
  try {
    const res = await api.get(`${API_BASE}/competitions`);
    // res = { success: true, data: [{name, code, key}, ...] }
    return res.data || res || [];
  } catch (error) {
    console.error('Error fetching available competitions:', error);
    return [];
  }
};

// Keep old function names for compatibility
export const getAvailableLeagues = getAvailableCompetitions;
export const getLeagueMatches = getCompetitionMatches;

export default {
  getUpcomingFootballMatches,
  getLiveFootballMatches,
  getMatchesByTeam,
  getCompetitionMatches,
  getAvailableCompetitions,
  getAvailableLeagues,
  getLeagueMatches
};