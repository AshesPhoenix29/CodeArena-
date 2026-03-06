// src/services/auth.service.js
// CodeArena — Auth Service (Phase 1)
// Wraps Supabase Auth for server-side usage

import { supabaseAdmin, supabaseClient } from '../config/supabase.js';

// ─────────────────────────────────────────────
// Sign Up
// ─────────────────────────────────────────────
export async function signUp({ email, password, username, displayName }) {
  // 1. Check username availability before creating auth user
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (existing) {
    throw Object.assign(new Error('Username already taken'), { code: 'USERNAME_TAKEN', status: 409 });
  }

  // 2. Create auth user — trigger will auto-create profile row
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,          // sends confirmation email
    user_metadata: {
      full_name: displayName || username,
    },
  });

  if (error) throw Object.assign(new Error(error.message), { code: error.code, status: 400 });

  // 3. Update the auto-generated username to the requested one
  await supabaseAdmin
    .from('users')
    .update({ username, display_name: displayName || username })
    .eq('id', data.user.id);

  return { userId: data.user.id, email: data.user.email };
}

// ─────────────────────────────────────────────
// Sign In  (returns session — send to client)
// ─────────────────────────────────────────────
export async function signIn({ email, password }) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw Object.assign(new Error(error.message), { code: error.code, status: 401 });
  return data; // { user, session }
}

// ─────────────────────────────────────────────
// Sign Out
// ─────────────────────────────────────────────
export async function signOut(accessToken) {
  const client = supabaseAdmin.auth.admin;
  // Revoke the specific JWT
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
  if (error) throw Object.assign(new Error(error.message), { code: error.code, status: 400 });
}

// ─────────────────────────────────────────────
// Verify & decode JWT (used in auth middleware)
// ─────────────────────────────────────────────
export async function verifyToken(accessToken) {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw Object.assign(new Error('Invalid or expired token'), { code: 'UNAUTHORIZED', status: 401 });
  }
  return data.user;
}

// ─────────────────────────────────────────────
// Refresh session
// ─────────────────────────────────────────────
export async function refreshSession(refreshToken) {
  const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token: refreshToken });
  if (error) throw Object.assign(new Error(error.message), { code: error.code, status: 401 });
  return data;
}

// ─────────────────────────────────────────────
// Get profile by user id
// ─────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, username, display_name, avatar_url, bio, total_solved, total_rooms, total_wins, created_at')
    .eq('id', userId)
    .single();

  if (error) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND', status: 404 });
  return data;
}

// ─────────────────────────────────────────────
// Update profile
// ─────────────────────────────────────────────
export async function updateProfile(userId, updates) {
  const allowed = ['display_name', 'avatar_url', 'bio'];
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(safe).length === 0) {
    throw Object.assign(new Error('No valid fields to update'), { code: 'BAD_REQUEST', status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(safe)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { code: error.code, status: 400 });
  return data;
}