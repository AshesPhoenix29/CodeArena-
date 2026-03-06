import 'dotenv/config';
import app from './src/app.js';
// ... rest of file
// src/server.js
//import app from './src/app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🏟  CodeArena backend running on port ${PORT}`);
  console.log(`   Phase 1 — Supabase + Auth ✓\n`);
});