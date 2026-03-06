// src/routes/auth.routes.js
// CodeArena — Auth Endpoints

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as AuthService from '../services/auth.service.js';

const router = Router();

// ── Validation helpers ────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ─────────────────────────────────────────────
// POST /auth/signup
// ─────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('username')
      .isLength({ min: 3, max: 20 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-20 chars, alphanumeric or underscore only'),
    body('displayName').optional().isLength({ max: 50 }).trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const result = await AuthService.signUp(req.body);
      res.status(201).json({ message: 'Account created. Check your email to confirm.', ...result });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /auth/signin
// ─────────────────────────────────────────────
router.post(
  '/signin',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res) => {
    try {
      const { user, session } = await AuthService.signIn(req.body);
      res.json({
        user: {
          id: user.id,
          email: user.email,
        },
        session: {
          access_token:  session.access_token,
          refresh_token: session.refresh_token,
          expires_at:    session.expires_at,
        },
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /auth/signout
// ─────────────────────────────────────────────
router.post('/signout', requireAuth, async (req, res) => {
  try {
    await AuthService.signOut(req.accessToken);
    res.json({ message: 'Signed out successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /auth/refresh
// ─────────────────────────────────────────────
router.post(
  '/refresh',
  [body('refresh_token').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { session } = await AuthService.refreshSession(req.body.refresh_token);
      res.json({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
        expires_at:    session.expires_at,
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /auth/me
// ─────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await AuthService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /auth/me
// ─────────────────────────────────────────────
router.patch(
  '/me',
  requireAuth,
  [
    body('display_name').optional().isLength({ max: 50 }).trim(),
    body('avatar_url').optional().isURL(),
    body('bio').optional().isLength({ max: 200 }).trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const updated = await AuthService.updateProfile(req.user.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

export default router;