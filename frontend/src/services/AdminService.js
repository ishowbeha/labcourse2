import api from './api';

const AdminService = {
  // Dashboard Statistics
  getDashboardStats: async () => {
    const response = await api.get('/admin/stats');
    return response;
  },

  // User Management
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response;
  },

  getUser: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response;
  },

  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response;
  },

  hardDeleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}/permanent`);
    return response;
  },

  getRoles: async () => {
    const response = await api.get('/admin/roles');
    return response;
  },

  // ==================== MATCH MANAGEMENT ====================

  // Get paginated admin matches with ticket stats
  getAdminMatches: async (params = {}) => {
    const response = await api.get('/matches/admin/all', { params });
    return response;
  },

  // Get single match
  getMatch: async (id) => {
    const response = await api.get(`/matches/${id}`);
    return response;
  },

  // Create match
  createMatch: async (matchData) => {
    const response = await api.post('/matches', matchData);
    return response;
  },

  // Update match
  updateMatch: async (id, matchData) => {
    const response = await api.put(`/matches/${id}`, matchData);
    return response;
  },

  // Delete match
  deleteMatch: async (id) => {
    const response = await api.delete(`/matches/${id}`);
    return response;
  },

  // Get all competitions
  getCompetitions: async () => {
    const response = await api.get('/matches/competitions');
    return response;
  },

  // Reports - Ticket Sales
  getTicketSalesByMatch: async () => {
    const response = await api.get('/admin/reports/ticket-sales');
    return response;
  },

  getRevenueAnalytics: async (period = 'monthly') => {
    const response = await api.get('/admin/reports/revenue', { params: { period } });
    return response;
  },

  getTopSellingMatches: async (limit = 10) => {
    const response = await api.get('/admin/reports/top-matches', { params: { limit } });
    return response;
  },

  // Orders Management
  getOrders: async (params = {}) => {
    const response = await api.get('/admin/orders', { params });
    return response;
  },

  getOrder: async (id) => {
    const response = await api.get(`/admin/orders/${id}`);
    return response;
  },

  updateOrderStatus: async (id, status) => {
    const response = await api.patch(`/admin/orders/${id}/status`, { status });
    return response;
  },

  // ==================== STADIUM MANAGEMENT ====================

  getStadiums: async (params = {}) => {
    const response = await api.get('/stadiums', { params });
    return response;
  },

  getStadium: async (id) => {
    const response = await api.get(`/stadiums/${id}`);
    return response;
  },

  getStadiumWithSections: async (id) => {
    const response = await api.get(`/stadiums/${id}/sections`);
    return response;
  },

  getStadiumSummary: async (id) => {
    const response = await api.get(`/stadiums/${id}/summary`);
    return response;
  },

  createStadium: async (stadiumData) => {
    const response = await api.post('/stadiums', stadiumData);
    return response;
  },

  updateStadium: async (id, stadiumData) => {
    const response = await api.put(`/stadiums/${id}`, stadiumData);
    return response;
  },

  deleteStadium: async (id) => {
    const response = await api.delete(`/stadiums/${id}`);
    return response;
  },

  hardDeleteStadium: async (id) => {
    const response = await api.delete(`/stadiums/${id}/permanent`);
    return response;
  },

  getStadiumCities: async () => {
    const response = await api.get('/stadiums/meta/cities');
    return response;
  },

  // Section operations
  getSections: async (stadiumId) => {
    const response = await api.get(`/stadiums/${stadiumId}/sections`);
    return response;
  },

  getSection: async (stadiumId, sectionId) => {
    const response = await api.get(`/stadiums/${stadiumId}/sections/${sectionId}`);
    return response;
  },

  createSection: async (stadiumId, sectionData) => {
    const response = await api.post(`/stadiums/${stadiumId}/sections`, sectionData);
    return response;
  },

  updateSection: async (stadiumId, sectionId, sectionData) => {
    const response = await api.put(`/stadiums/${stadiumId}/sections/${sectionId}`, sectionData);
    return response;
  },

  deleteSection: async (stadiumId, sectionId) => {
    const response = await api.delete(`/stadiums/${stadiumId}/sections/${sectionId}`);
    return response;
  },

  // Refund order (soft-delete with notification to user)
  refundOrder: async (id) => {
    const response = await api.post(`/admin/orders/${id}/refund`);
    return response;
  },

  // Hard delete order (permanent, no trace)
  deleteOrder: async (id) => {
    const response = await api.delete(`/admin/orders/${id}`);
    return response;
  }
};

export default AdminService;