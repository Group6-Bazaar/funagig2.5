import pool from '../db/pool.js';

export const create = async (applicationData) => {
  const { user_id, gig_id, message, resume_path } = applicationData;
  const result = await pool.query(
    `INSERT INTO applications (user_id, gig_id, message, resume_path) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [user_id, gig_id, message, resume_path]
  );
  
  // Increment gig application count
  await pool.query('UPDATE gigs SET application_count = application_count + 1 WHERE id = $1', [gig_id]);
  
  return result.rows[0];
};

export const findByStudent = async (studentId) => {
  const result = await pool.query(
    `SELECT a.*, g.title as gig_title, g.budget, u.name as business_name 
     FROM applications a 
     JOIN gigs g ON a.gig_id = g.id 
     JOIN users u ON g.user_id = u.id 
     WHERE a.user_id = $1 
     ORDER BY a.applied_at DESC`,
    [studentId]
  );
  return result.rows;
};

export const findByGig = async (gigId) => {
  const result = await pool.query(
    `SELECT a.*, u.name as student_name, u.email as student_email, u.profile_image, u.skills, u.university 
     FROM applications a 
     JOIN users u ON a.user_id = u.id 
     WHERE a.gig_id = $1 
     ORDER BY a.applied_at DESC`,
    [gigId]
  );
  return result.rows;
};

export const findById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM applications WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export const updateStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE applications 
     SET status = $1, responded_at = NOW() 
     WHERE id = $2 
     RETURNING *`,
    [status, id]
  );
  return result.rows[0];
};
