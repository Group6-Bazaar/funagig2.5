import pool from '../db/pool.js';

export const findAll = async (filters = {}) => {
  let query = `
    SELECT g.*, u.name as business_name, u.industry, u.profile_image 
    FROM gigs g 
    JOIN users u ON g.user_id = u.id 
    WHERE 1=1
  `;
  const values = [];
  let paramIndex = 1;

  if (filters.status) {
    query += ` AND g.status = $${paramIndex++}`;
    values.push(filters.status);
  } else {
    query += ` AND g.status = 'active'`;
  }

  if (filters.businessId) {
    query += ` AND g.user_id = $${paramIndex++}`;
    values.push(filters.businessId);
  }

  if (filters.search) {
    query += ` AND (g.title ILIKE $${paramIndex} OR g.description ILIKE $${paramIndex})`;
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY g.created_at DESC`;

  const result = await pool.query(query, values);
  return result.rows;
};

export const findById = async (id) => {
  const result = await pool.query(
    `SELECT g.*, u.name as business_name, u.industry, u.profile_image 
     FROM gigs g 
     JOIN users u ON g.user_id = u.id 
     WHERE g.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const create = async (gigData) => {
  const { user_id, title, description, budget, deadline, skills, location, type, status } = gigData;
  const result = await pool.query(
    `INSERT INTO gigs (user_id, title, description, budget, deadline, skills, location, type, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [user_id, title, description, budget, deadline, skills, location, type, status || 'active']
  );
  return result.rows[0];
};

export const update = async (id, gigData) => {
  const { title, description, budget, deadline, skills, location, type, status } = gigData;
  const result = await pool.query(
    `UPDATE gigs 
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         budget = COALESCE($3, budget),
         deadline = COALESCE($4, deadline),
         skills = COALESCE($5, skills),
         location = COALESCE($6, location),
         type = COALESCE($7, type),
         status = COALESCE($8, status),
         updated_at = NOW()
     WHERE id = $9 
     RETURNING *`,
    [title, description, budget, deadline, skills, location, type, status, id]
  );
  return result.rows[0];
};

export const deleteGig = async (id) => {
  const result = await pool.query(
    'DELETE FROM gigs WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rowCount > 0;
};
