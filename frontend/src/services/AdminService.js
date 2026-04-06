import api from './api';

const AdminService = {
  // Dashboard Statistics
  getDashboardStats: async () => {
    // The API interceptor already unwraps response.data, so response is { success: true, data: {...} }
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
  }
};

export default AdminService;
