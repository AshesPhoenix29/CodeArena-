// src/middleware/auth.middleware.js
// CodeArena — JWT Auth Middleware

import { supabaseAdmin, supabaseClient } from '../config/supabase.js';
import { verifyToken } from '../services/auth.service.js';

// ─────────────────────────────────────────────
// requireAuth  — protects any route
// Attaches req.user = Supabase auth user object
// ─────────────────────────────────────────────
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    req.user = await verifyToken(token);
    req.accessToken = token;
    next();
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────
// optionalAuth  — attaches user if token present
// but doesn't block unauthenticated requests
// ─────────────────────────────────────────────
export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (token) {
      req.user = await verifyToken(token);
      req.accessToken = token;
    }
  } catch (_) {
    // ignore — unauthenticated request continues
  }
  next();
}