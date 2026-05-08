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

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the FunaGig API',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      gigs: '/api/gigs',
      applications: '/api/applications',
      messages: '/api/messages'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);
// app.use('/api/profiles', profileRoutes);
// app.use('/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
