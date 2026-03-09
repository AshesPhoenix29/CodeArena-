// src/validators/questionValidators.js
import Joi from 'joi';

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

export const questionSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),

  description: Joi.string().min(10).required()
    .messages({ 'string.min': 'Description must be at least 10 characters' }),

  difficulty: Joi.string().valid(...DIFFICULTY_LEVELS).required(),

  topics: Joi.array()
    .items(Joi.string().max(50))
    .min(1).max(10)
    .required()
    .messages({ 'array.min': 'At least one topic is required' }),

  constraints: Joi.string().max(1000).allow('', null).optional(),

  examples: Joi.array().items(
    Joi.object({
      input:       Joi.string().required(),
      output:      Joi.string().required(),
      explanation: Joi.string().allow('', null).optional(),
    })
  ).min(1).max(5).required()
    .messages({ 'array.min': 'At least one example is required' }),

  hints: Joi.array()
    .items(Joi.string().max(500))
    .max(5)
    .optional()
    .default([]),

  time_limit_ms:   Joi.number().integer().min(500).max(10000).default(2000),
  memory_limit_mb: Joi.number().integer().min(32).max(512).default(256),
  is_public:       Joi.boolean().default(false),
});

export const testCaseSchema = Joi.object({
  input:        Joi.string().required(),
  expected:     Joi.string().required(),
  is_sample:    Joi.boolean().default(false),
  is_hidden:    Joi.boolean().default(true),
  label:        Joi.string().max(100).allow('', null).optional(),
  score_weight: Joi.number().min(0).max(10).default(1.0),
  order_index:  Joi.number().integer().min(0).optional(),
});

export const bulkTestCaseSchema = Joi.object({
  test_cases: Joi.array()
    .items(testCaseSchema)
    .min(1)
    .max(50)
    .required()
    .messages({ 'array.min': 'At least one test case required' }),
});