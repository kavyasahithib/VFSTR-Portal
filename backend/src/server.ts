import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Initialize environment variables first
dotenv.config();

// Import routers
import authRouter from './controllers/auth';
import studentsRouter from './controllers/students';
import attendanceRouter from './controllers/attendance';
import reportsRouter from './controllers/reports';

// Import middleware
import { authenticateToken } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Set Secure HTTP Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Enable CORS dynamically for development and production domains
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.FRONTEND_URL) {
  // Allow multiple URLs if comma-separated
  process.env.FRONTEND_URL.split(',').forEach((url) => allowedOrigins.push(url.trim()));
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(express.json());

// Serving static files (if any)
app.use(express.static(path.join(__dirname, '../public')));

// Root status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Attendance API is operational.' });
});

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/students', authenticateToken, studentsRouter);
app.use('/api/attendance', authenticateToken, attendanceRouter);
app.use('/api/reports', authenticateToken, reportsRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
