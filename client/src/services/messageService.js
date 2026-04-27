import { fetchApi } from '../lib/api.js';

export const messageService = {
  getConversations: async () => {
    return fetchApi('/messages/conversations');
  },

  getMessages: async (conversationId) => {
    return fetchApi(`/messages/${conversationId}`);
  },

  getOrCreateConversation: async (targetUserId) => {
    return fetchApi('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ targetUserId })
    });
  },

  sendMessageRest: async (conversationId, content) => {
    return fetchApi('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, content })
    });
  },

  // WebSocket Methods
  ws: null,

  connect: (conversationId, onMessage) => {
    if (messageService.ws) {
      messageService.disconnect();
    }

    const token = localStorage.getItem('jwt_token');
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    
    // Construct WebSocket URL with JWT token and room ID
    const url = new URL(wsUrl);
    url.searchParams.append('token', token);
    url.searchParams.append('convId', conversationId);

    messageService.ws = new WebSocket(url.toString());

    messageService.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onMessage(payload);
      } catch (err) {
        console.error('Failed to parse incoming WS message:', err);
      }
    };

    messageService.ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    messageService.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  },

  disconnect: () => {
    if (messageService.ws) {
      messageService.ws.close();
      messageService.ws = null;
    }
  }
};
