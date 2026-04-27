import * as applicationRepo from '../repositories/application.repo.js';
import * as gigRepo from '../repositories/gig.repo.js';

export const createApplication = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can apply to gigs' });
    }

    const { gig_id, message, resume_path } = req.body;

    const gig = await gigRepo.findById(gig_id);
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    if (gig.status !== 'active') {
      return res.status(400).json({ error: 'Cannot apply to an inactive gig' });
    }

    // Check for duplicate application
    const existingApps = await applicationRepo.findByStudent(req.user.id);
    const hasApplied = existingApps.some(app => app.gig_id === parseInt(gig_id));
    if (hasApplied) {
      return res.status(400).json({ error: 'You have already applied to this gig' });
    }

    const application = await applicationRepo.create({
      user_id: req.user.id,
      gig_id,
      message,
      resume_path
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Create application error:', error);
    if (error.code === '23505') { // Postgres unique violation code
      return res.status(400).json({ error: 'You have already applied to this gig' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudentApplications = async (req, res) => {
  try {
    // A student can see their own applications, or an admin can view them.
    // For now, assume a student viewing their own.
    const studentId = req.params.id || req.user.id;
    
    if (req.user.role === 'student' && studentId !== req.user.id) {
       return res.status(403).json({ error: 'Forbidden' });
    }

    const apps = await applicationRepo.findByStudent(studentId);
    res.json(apps);
  } catch (error) {
    console.error('Get student applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGigApplications = async (req, res) => {
  try {
    const gigId = req.params.id;
    const gig = await gigRepo.findById(gigId);
    
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    if (gig.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this gig' });
    }

    const apps = await applicationRepo.findByGig(gigId);
    res.json(apps);
  } catch (error) {
    console.error('Get gig applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appId = req.params.id;

    if (!['accepted', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const app = await applicationRepo.findById(appId);
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const gig = await gigRepo.findById(app.gig_id);
    if (gig.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this gig' });
    }

    const updatedApp = await applicationRepo.updateStatus(appId, status);
    res.json(updatedApp);
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
