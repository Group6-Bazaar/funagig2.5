import pool from '../db/pool.js';

export const findConversationsByUser = async (userId) => {
  const result = await pool.query(
    `SELECT c.*, 
            u1.name as user1_name, u1.profile_image as user1_image, u1.type as user1_type,
            u2.name as user2_name, u2.profile_image as user2_image, u2.type as user2_type,
            (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_sender_id
     FROM conversations c
     JOIN users u1 ON c.user1_id = u1.id
     JOIN users u2 ON c.user2_id = u2.id
     WHERE c.user1_id = $1 OR c.user2_id = $1
     ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const findMessagesByConversation = async (conversationId) => {
  const result = await pool.query(
    `SELECT m.*, u.name as sender_name 
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at ASC`,
    [conversationId]
  );
  return result.rows;
};

export const findOrCreateConversation = async (user1Id, user2Id) => {
  // Ensure consistent ordering to avoid duplicates (e.g. 1-2 is same as 2-1)
  const u1 = user1Id < user2Id ? user1Id : user2Id;
  const u2 = user1Id < user2Id ? user2Id : user1Id;

  // Try to find
  let result = await pool.query(
    `SELECT * FROM conversations WHERE user1_id = $1 AND user2_id = $2`,
    [u1, u2]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Create if not exists
  result = await pool.query(
    `INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING *`,
    [u1, u2]
  );
  return result.rows[0];
};

export const insertMessage = async (conversationId, senderId, content) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert message
    const msgResult = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, content) 
       VALUES ($1, $2, $3) RETURNING *`,
      [conversationId, senderId, content]
    );
    const newMessage = msgResult.rows[0];

    // Update conversation last_message_at
    await client.query(
      `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    await client.query('COMMIT');
    return newMessage;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
