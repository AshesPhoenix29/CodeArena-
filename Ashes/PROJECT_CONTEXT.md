# Project Context & Architecture Decisions

## Project Evolution
1.  **Initial Concept:** Real-time 1v1 coding battles (CodeArena).
2.  **Pivot:** Shifted to "Battle Royale" style rooms (multiple users competing) rather than just 1v1.
3.  **Editor Choice:** Selected **Monaco Editor** (VS Code style) for a professional developer experience.

## Technology Stack Decisions

### 1. Code Execution: Judge0 vs. Piston
*   **Initial Thought:** Piston API.
*   **Final Decision:** **Judge0**.
*   **Reasoning:** Judge0 is the industry standard for competitive programming platforms. It handles **Input/Output comparison** natively (we send expected output, it returns "Accepted" or "Wrong Answer"), simplifying our backend logic significantly.

### 2. Backend & Database: The "Hybrid" Approach
*   **Problem:** Should we use Supabase for everything (Realtime, DB, Auth) or a custom server?
*   **Decision:** **Hybrid Architecture**.
    *   **Supabase:** Handles **Authentication** (secure, ready-to-use) and **Database** (PostgreSQL for storing Problems, Test Cases, User Profiles).
    *   **Node.js + Socket.io:** Handles **Real-time Game State** (Rooms, "User X is typing", Leaderboards). Using Supabase Realtime for high-frequency game updates would be less efficient and harder to manage than in-memory Socket.io rooms.
    *   **Proxy Logic:** The Node.js server acts as a secure proxy between the Frontend and Judge0, injecting hidden test cases from Supabase so users can't see them.

## Recruiter-Ready Focus Areas
To make this project stand out for hiring, we are focusing on:
1.  **Resilience:** Handling disconnections and service failures gracefully.
2.  **Architecture:** Clear separation of concerns (documented here).
3.  **Security:** Sandboxed execution via Judge0; Backend validation of test cases.
4.  **UX Polish:** Optimistic UI updates and clean states.
5.  **Git Hygiene:** Feature-based commits.

## Next Steps
1.  Scaffold the Monorepo (Frontend/Backend).
2.  Implement the Node.js Server with Socket.io.
3.  Set up the React Frontend with Monaco Editor.
