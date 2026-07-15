import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbQuery } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { OAuth2Client } from 'google-auth-library';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-cr-key-2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const oAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Google Sign-In Authentication
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Google ID Token is required.' });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google Client ID is not configured on the server.' });
    }

    // Verify token with Google
    const ticket = await oAuthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({ message: 'Invalid Google token.' });
    }

    const email = payload.email.toLowerCase();

    // Check if the email matches process.env.ALLOWED_CR_EMAIL list or is in the DB
    const allowedEmailsStr = process.env.ALLOWED_CR_EMAIL || 'cr@attendance.com';
    const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());
    
    let user = await dbQuery.get<{ id: number; email: string; role: string }>(
      'SELECT id, email, role FROM users WHERE LOWER(email) = ?',
      [email]
    );

    // Create user record on first login if it matches the configured CR/LR email
    if (!user && allowedEmails.includes(email)) {
      await dbQuery.run(
        "INSERT INTO users (email, password, role) VALUES (?, ?, 'admin')",
        [email, 'oauth-user-no-password']
      );
      user = await dbQuery.get<{ id: number; email: string; role: string }>(
        'SELECT id, email, role FROM users WHERE LOWER(email) = ?',
        [email]
      );
    }

    if (!user) {
      return res.status(401).json({ message: `Access denied. Email '${email}' is not authorized.` });
    }

    // Issue JWT token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    res.status(401).json({ message: 'Google authentication failed: ' + (err.message || err) });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await dbQuery.get<{ id: number; email: string; password: string; role: string }>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// get current user (auth check)
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  res.json({ user: req.user });
});

// change password
router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required.' });
    }

    const user = await dbQuery.get<{ password: string }>('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await dbQuery.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
