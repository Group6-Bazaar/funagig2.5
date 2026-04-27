import express from 'express';
import { body } from 'express-validator';
import * as messageController from '../controllers/messages.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const messageValidation = [
  body('conversation_id').isInt().withMessage('Valid conversation ID is required'),
  body('content').trim().notEmpty().withMessage('Message content is required')
];

router.get('/conversations', requireAuth, messageController.getConversations);
router.post('/conversations', requireAuth, messageController.getOrCreateConversation);
router.get('/:id', requireAuth, messageController.getMessages);
router.post('/send', requireAuth, messageValidation, validate, messageController.sendMessage);

export default router;
