import api from './api';

const API_BASE = '/matches';

export const getAllMatches = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    
    const response = await api.get(`${API_BASE}?${params.toString()}`);
    // The axios interceptor already returns response.data, so we access .data directly
    return response.data || [];
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};

export const getUpcomingMatches = async () => {
  try {
    const response = await api.get(`${API_BASE}/upcoming`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    return [];
  }
};

export const getMatchById = async (id) => {
  try {
    const response = await api.get(`${API_BASE}/${id}`);
    return response.data || null;
  } catch (error) {
    console.error('Error fetching match:', error);
    return null;
  }
};

export const getMatchesByTeam = async (team) => {
  try {
    const response = await api.get(`${API_BASE}/team/${encodeURIComponent(team)}`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching team matches:', error);
    return [];
  }
};

export default {
  getAllMatches,
  getUpcomingMatches,
  getMatchById,
  getMatchesByTeam
};
