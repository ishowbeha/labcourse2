import api from './api';

const TicketPurchaseService = {
  purchaseTickets: async (purchaseData) => {
    const response = await api.post('/orders/purchase', purchaseData);
    return response;
  },

  getUserOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response;
  }
};

export default TicketPurchaseService;