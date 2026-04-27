import * as messageRepo from '../repositories/message.repo.js';
import { broadcastToRoom } from '../sockets/messageSocket.js';

export const getConversations = async (req, res) => {
  try {
    const convs = await messageRepo.findConversationsByUser(req.user.id);
    res.json(convs);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await messageRepo.findMessagesByConversation(id);
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrCreateConversation = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    const conv = await messageRepo.findOrCreateConversation(req.user.id, targetUserId);
    res.json(conv);
  } catch (error) {
    console.error('Find/create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversation_id, content } = req.body;
    
    // Insert into DB
    const message = await messageRepo.insertMessage(conversation_id, req.user.id, content);
    
    // Broadcast via WebSocket using broker
    // Attach sender info so client has context
    const payload = {
      ...message,
      sender_name: req.user.name || req.user.email // Assuming token might have email
    };
    
    broadcastToRoom(conversation_id, payload);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
