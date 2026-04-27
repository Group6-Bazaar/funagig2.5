import * as gigRepo from '../repositories/gig.repo.js';

export const getAllGigs = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      businessId: req.query.businessId,
      search: req.query.search
    };
    
    const gigs = await gigRepo.findAll(filters);
    res.json(gigs);
  } catch (error) {
    console.error('Get all gigs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGigById = async (req, res) => {
  try {
    const gig = await gigRepo.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    res.json(gig);
  } catch (error) {
    console.error('Get gig by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGig = async (req, res) => {
  try {
    if (req.user.role !== 'business') {
      return res.status(403).json({ error: 'Only businesses can post gigs' });
    }

    const newGig = await gigRepo.create({
      ...req.body,
      user_id: req.user.id
    });

    res.status(201).json(newGig);
  } catch (error) {
    console.error('Create gig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateGig = async (req, res) => {
  try {
    const gig = await gigRepo.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    if (gig.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this gig' });
    }

    const updatedGig = await gigRepo.update(req.params.id, req.body);
    res.json(updatedGig);
  } catch (error) {
    console.error('Update gig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGig = async (req, res) => {
  try {
    const gig = await gigRepo.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    if (gig.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this gig' });
    }

    await gigRepo.deleteGig(req.params.id);
    res.json({ message: 'Gig deleted successfully' });
  } catch (error) {
    console.error('Delete gig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
