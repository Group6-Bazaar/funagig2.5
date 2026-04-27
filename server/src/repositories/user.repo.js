import pool from '../db/pool.js';

export const findByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};

export const findById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export const create = async (userData) => {
  const { name, email, passwordHash, type } = userData;
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, type) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, name, email, type, is_active, created_at`,
    [name, email, passwordHash, type]
  );
  return result.rows[0];
};

export const updatePassword = async (id, passwordHash) => {
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
    [passwordHash, id]
  );
  return result.rowCount > 0;
};
