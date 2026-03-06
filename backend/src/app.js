// src/app.js
// CodeArena — Express App

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';

const app = express();

// ── Security ─────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────
app.use('/api/auth/signin', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts' } }));
app.use('/api/auth/signup', rateLimit({ windowMs: 60 * 60 * 1000, max: 5,  message: { error: 'Too many sign-up attempts' } }));

// ── Body parsing ──────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────
app.use('/api/auth', authRoutes);

// Phase 2+ routes registered here as we build:
// app.use('/api/rooms',       roomRoutes);
// app.use('/api/questions',   questionRoutes);
// app.use('/api/submissions', submissionRoutes);

// ── Health check ──────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', phase: 1 }));

// ── Global error handler ──────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;