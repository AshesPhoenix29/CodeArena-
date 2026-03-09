// src/controllers/questionController.js
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../lib/errors.js';

// ─────────────────────────────────────────
// LIST  GET /api/questions
// ─────────────────────────────────────────
export const list = async (req, res, next) => {
  try {
    const {
      difficulty,
      topics,
      search,
      status = 'active',
      page  = 1,
      limit = 20,
      my    = false,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const userId = req.user?.id;

    let query = supabaseAdmin
      .from('questions')
      .select(`
        id, title, slug, difficulty, status, topics,
        is_public, created_by, created_at,
        question_stats ( total_attempts, total_solved, acceptance_rate )
      `, { count: 'exact' });

    if (my === 'true' && userId) {
      query = query.eq('created_by', userId);
    } else {
      query = query.eq('status', status).eq('is_public', true);
    }

    if (difficulty) query = query.eq('difficulty', difficulty);
    if (topics)     query = query.overlaps('topics', topics.split(',').map(t => t.trim()));
    if (search)     query = query.ilike('title', `%${search}%`);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      questions: data,
      pagination: {
        total: count,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET ONE  GET /api/questions/:slug
// ─────────────────────────────────────────
export const getOne = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabaseAdmin
      .from('questions')
      .select(`
        *,
        question_stats(*),
        test_cases ( id, input, expected, is_sample, label, order_index )
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) throw new AppError('Question not found', 404);

    const userId  = req.user?.id;
    const isOwner = data.created_by === userId;

    if (!isOwner) {
      data.test_cases = data.test_cases.filter(tc => tc.is_sample);
    }

    res.json({ question: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// CREATE  POST /api/questions
// ─────────────────────────────────────────
export const create = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      title, description, difficulty, topics, constraints,
      examples, hints, time_limit_ms, memory_limit_mb, is_public,
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert({
        title, description, difficulty, topics, constraints,
        examples:        examples        || [],
        hints:           hints           || [],
        time_limit_ms:   time_limit_ms   || 2000,
        memory_limit_mb: memory_limit_mb || 256,
        is_public:       is_public       || false,
        created_by:      userId,
        status:          'draft',
        slug:            '',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ question: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// UPDATE  PUT /api/questions/:id
// ─────────────────────────────────────────
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: existing } = await supabaseAdmin
      .from('questions')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!existing) throw new AppError('Question not found', 404);
    if (existing.created_by !== userId) throw new AppError('Forbidden', 403);

    const {
      title, description, difficulty, topics, constraints,
      examples, hints, time_limit_ms, memory_limit_mb, is_public,
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from('questions')
      .update({
        title, description, difficulty, topics, constraints,
        examples, hints, time_limit_ms, memory_limit_mb, is_public,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ question: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// UPDATE STATUS  PATCH /api/questions/:id/status
// ─────────────────────────────────────────
export const updateStatus = async (req, res, next) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;
    const userId     = req.user.id;

    const VALID = ['draft', 'active', 'archived'];
    if (!VALID.includes(status)) throw new AppError('Invalid status', 400);

    if (status === 'active') {
      const { count } = await supabaseAdmin
        .from('test_cases')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', id)
        .eq('is_hidden', true);

      if (!count || count === 0) {
        throw new AppError('Add at least one hidden test case before publishing', 400);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .update({ status })
      .eq('id', id)
      .eq('created_by', userId)
      .select()
      .single();

    if (error || !data) throw new AppError('Question not found or forbidden', 404);

    res.json({ question: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// DELETE  DELETE /api/questions/:id
// ─────────────────────────────────────────
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', id)
      .eq('created_by', userId);

    if (error) throw error;

    res.json({ message: 'Question deleted' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET TEST CASES  GET /api/questions/:id/test-cases
// ─────────────────────────────────────────
export const getTestCases = async (req, res, next) => {
  try {
    const { id }  = req.params;
    const userId  = req.user.id;

    const { data: question } = await supabaseAdmin
      .from('questions')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!question) throw new AppError('Question not found', 404);

    let query = supabaseAdmin
      .from('test_cases')
      .select('*')
      .eq('question_id', id)
      .order('order_index');

    if (question.created_by !== userId) {
      query = query.eq('is_sample', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ test_cases: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// ADD TEST CASES  POST /api/questions/:id/test-cases
// ─────────────────────────────────────────
export const addTestCases = async (req, res, next) => {
  try {
    const { id }         = req.params;
    const { test_cases } = req.body;
    const userId         = req.user.id;

    const { data: question } = await supabaseAdmin
      .from('questions')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!question) throw new AppError('Question not found', 404);
    if (question.created_by !== userId) throw new AppError('Forbidden', 403);

    const rows = test_cases.map((tc, i) => ({
      question_id:  id,
      input:        tc.input,
      expected:     tc.expected,
      is_sample:    tc.is_sample   ?? false,
      is_hidden:    tc.is_hidden   ?? true,
      label:        tc.label       ?? null,
      score_weight: tc.score_weight ?? 1.0,
      order_index:  tc.order_index  ?? i,
    }));

    const { data, error } = await supabaseAdmin
      .from('test_cases')
      .insert(rows)
      .select();

    if (error) throw error;

    res.status(201).json({ test_cases: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// UPDATE TEST CASE  PUT /api/questions/:id/test-cases/:caseId
// ─────────────────────────────────────────
export const updateTestCase = async (req, res, next) => {
  try {
    const { id, caseId } = req.params;
    const userId         = req.user.id;

    const { data: question } = await supabaseAdmin
      .from('questions')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!question || question.created_by !== userId) throw new AppError('Forbidden', 403);

    const { input, expected, is_sample, is_hidden, label, score_weight, order_index } = req.body;

    const { data, error } = await supabaseAdmin
      .from('test_cases')
      .update({ input, expected, is_sample, is_hidden, label, score_weight, order_index })
      .eq('id', caseId)
      .eq('question_id', id)
      .select()
      .single();

    if (error || !data) throw new AppError('Test case not found', 404);

    res.json({ test_case: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// DELETE TEST CASE  DELETE /api/questions/:id/test-cases/:caseId
// ─────────────────────────────────────────
export const deleteTestCase = async (req, res, next) => {
  try {
    const { id, caseId } = req.params;
    const userId         = req.user.id;

    const { data: question } = await supabaseAdmin
      .from('questions')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!question || question.created_by !== userId) throw new AppError('Forbidden', 403);

    const { error } = await supabaseAdmin
      .from('test_cases')
      .delete()
      .eq('id', caseId)
      .eq('question_id', id);

    if (error) throw error;

    res.json({ message: 'Test case deleted' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET TOPICS  GET /api/questions/topics
// ─────────────────────────────────────────
export const getTopics = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('questions')
      .select('topics')
      .eq('status', 'active')
      .eq('is_public', true);

    if (error) throw error;

    const allTopics = [...new Set(data.flatMap(q => q.topics))].sort();

    res.json({ topics: allTopics });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET STATS  GET /api/questions/:id/stats
// ─────────────────────────────────────────
export const getStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('question_stats')
      .select('*')
      .eq('question_id', id)
      .single();

    if (error || !data) throw new AppError('Stats not found', 404);

    res.json({ stats: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// ADD TO ROOM  POST /api/questions/:id/rooms/:roomId
// ─────────────────────────────────────────
export const addToRoom = async (req, res, next) => {
  try {
    const { id, roomId }              = req.params;
    const { points = 100, order_index = 0 } = req.body;
    const userId = req.user.id;

    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('host_id, status')
      .eq('id', roomId)
      .single();

    if (!room) throw new AppError('Room not found', 404);
    if (room.host_id !== userId) throw new AppError('Only the host can add questions', 403);
    if (room.status !== 'waiting') throw new AppError('Room has already started', 400);

    const { data, error } = await supabaseAdmin
      .from('room_questions')
      .insert({ room_id: roomId, question_id: id, points, order_index })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError('Question already in room', 409);
      throw error;
    }

    res.status(201).json({ room_question: data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// REMOVE FROM ROOM  DELETE /api/questions/:id/rooms/:roomId
// ─────────────────────────────────────────
export const removeFromRoom = async (req, res, next) => {
  try {
    const { id, roomId } = req.params;
    const userId         = req.user.id;

    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();

    if (!room || room.host_id !== userId) throw new AppError('Forbidden', 403);

    const { error } = await supabaseAdmin
      .from('room_questions')
      .delete()
      .eq('question_id', id)
      .eq('room_id', roomId);

    if (error) throw error;

    res.json({ message: 'Question removed from room' });
  } catch (err) {
    next(err);
  }
};