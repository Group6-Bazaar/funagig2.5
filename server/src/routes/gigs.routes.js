import express from 'express';
import { body } from 'express-validator';
import * as gigController from '../controllers/gigs.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation schemas
const gigValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('budget').isNumeric().withMessage('Budget must be a number'),
  body('deadline').isISO8601().toDate().withMessage('Valid deadline is required')
];

// Routes
router.get('/', gigController.getAllGigs);
router.get('/:id', gigController.getGigById);
router.post('/', requireAuth, gigValidation, validate, gigController.createGig);
router.patch('/:id', requireAuth, gigController.updateGig);
router.delete('/:id', requireAuth, gigController.deleteGig);

export default router;
