import api from './api';

const messagingService = {
  getConversations: async () => {
    const response = await api.get('/messaging/conversations');
    return response.data;
  },

  createConversation: async (partnerId) => {
    const response = await api.post('/messaging/conversations', { partnerId });
    return response.data;
  },

  getMessages: async (conversationId, page = 1) => {
    const response = await api.get(`/messaging/conversations/${conversationId}/messages`, {
      params: { page },
    });
    return response.data;
  },

  sendMessage: async (conversationId, text) => {
    const response = await api.post(`/messaging/conversations/${conversationId}/messages`, { text });
    return response.data;
  },
};

export default messagingService;
