// src/routes/questions.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { questionSchema, testCaseSchema, bulkTestCaseSchema } from '../validators/questionValidators.js';
import * as questionController from '../controllers/questionController.js';

const router = Router();

// ─── Public ───────────────────────────────────────────────────
router.get('/topics',         questionController.getTopics);
router.get('/',               questionController.list);
router.get('/:slug',          questionController.getOne);

// ─── Authenticated ────────────────────────────────────────────
router.use(authenticate);

router.get('/:id/test-cases', questionController.getTestCases);
router.get('/:id/stats',      questionController.getStats);

// ─── Question CRUD ────────────────────────────────────────────
router.post('/',
  validate(questionSchema),
  questionController.create
);

router.put('/:id',
  validate(questionSchema),
  questionController.update
);

router.patch('/:id/status',   questionController.updateStatus);
router.delete('/:id',         questionController.remove);

// ─── Test Case CRUD ───────────────────────────────────────────
router.post('/:id/test-cases',
  validate(bulkTestCaseSchema),
  questionController.addTestCases
);

router.put('/:id/test-cases/:caseId',
  validate(testCaseSchema),
  questionController.updateTestCase
);

router.delete('/:id/test-cases/:caseId', questionController.deleteTestCase);

// ─── Room linking ─────────────────────────────────────────────
router.post('/:id/rooms/:roomId',   questionController.addToRoom);
router.delete('/:id/rooms/:roomId', questionController.removeFromRoom);

export default router;