import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import gigRoutes from './routes/gigs.routes.js';
import applicationRoutes from './routes/applications.routes.js';
import messageRoutes from './routes/messages.routes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount Routes
app.use('/auth', authRoutes);
app.use('/gigs', gigRoutes);
app.use('/applications', applicationRoutes);
app.use('/messages', messageRoutes);
// app.use('/profiles', profileRoutes);
// app.use('/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
