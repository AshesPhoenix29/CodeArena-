// src/routes/room.routes.js
// CodeArena — Room Endpoints (Phase 2)

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as RoomService from '../services/room.service.js';

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ─────────────────────────────────────────────
// POST /rooms — Create a room
// ─────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  [
    body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 chars'),
    body('duration_mins').optional().isInt({ min: 5, max: 360 }),
    body('max_members').optional().isInt({ min: 2, max: 50 }),
    body('is_private').optional().isBoolean(),
    body('difficulty').optional().isArray(),
    body('topics').optional().isArray(),
    body('allow_language').optional().isArray(),
    body('show_leaderboard').optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const room = await RoomService.createRoom(req.user.id, req.body);
      res.status(201).json(room);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /rooms/me — My rooms
// ─────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const rooms = await RoomService.getMyRooms(req.user.id);
    res.json(rooms);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /rooms/code/:code — Lookup by invite code
// ─────────────────────────────────────────────
router.get(
  '/code/:code',
  requireAuth,
  [param('code').isLength({ min: 5, max: 5 }).toUpperCase()],
  validate,
  async (req, res) => {
    try {
      const room = await RoomService.getRoomByCode(req.params.code);
      res.json(room);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /rooms/:id — Room details
// ─────────────────────────────────────────────
router.get(
  '/:id',
  requireAuth,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const room = await RoomService.getRoomById(req.params.id, req.user.id);
      res.json(room);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /rooms/join — Join by code
// ─────────────────────────────────────────────
router.post(
  '/join',
  requireAuth,
  [body('code').trim().isLength({ min: 5, max: 5 }).withMessage('Invalid room code')],
  validate,
  async (req, res) => {
    try {
      const room = await RoomService.joinRoom(req.user.id, req.body.code);
      res.json(room);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /rooms/:id/leave — Leave a room
// ─────────────────────────────────────────────
router.post(
  '/:id/leave',
  requireAuth,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const result = await RoomService.leaveRoom(req.user.id, req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// PATCH /rooms/:id/ready — Toggle ready status
// ─────────────────────────────────────────────
router.patch(
  '/:id/ready',
  requireAuth,
  [
    param('id').isUUID(),
    body('is_ready').isBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const result = await RoomService.setReady(req.user.id, req.params.id, req.body.is_ready);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /rooms/:id/start — Start room (host only)
// ─────────────────────────────────────────────
router.post(
  '/:id/start',
  requireAuth,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const room = await RoomService.startRoom(req.user.id, req.params.id);
      res.json(room);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /rooms/:id/cancel — Cancel room (host only)
// ─────────────────────────────────────────────
router.post(
  '/:id/cancel',
  requireAuth,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const room = await RoomService.cancelRoom(req.user.id, req.params.id);
      res.json(room);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /rooms/:id/members/:userId — Kick (host only)
// ─────────────────────────────────────────────
router.delete(
  '/:id/members/:userId',
  requireAuth,
  [param('id').isUUID(), param('userId').isUUID()],
  validate,
  async (req, res) => {
    try {
      const result = await RoomService.kickMember(req.user.id, req.params.id, req.params.userId);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

export default router;