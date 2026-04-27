import express from 'express';
import { body } from 'express-validator';
import * as applicationController from '../controllers/applications.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation schemas
const applicationValidation = [
  body('gig_id').isInt().withMessage('Valid gig ID is required'),
  body('message').optional().trim()
];

const statusValidation = [
  body('status').isIn(['accepted', 'rejected', 'completed']).withMessage('Invalid status')
];

// Routes
router.post('/', requireAuth, applicationValidation, validate, applicationController.createApplication);
router.get('/student/:id?', requireAuth, applicationController.getStudentApplications);
router.get('/gig/:id', requireAuth, applicationController.getGigApplications);
router.patch('/:id/status', requireAuth, statusValidation, validate, applicationController.updateApplicationStatus);

export default router;
