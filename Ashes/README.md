# CodeArena: Real-Time Coding Battle Royale

## 🚀 Overview
CodeArena is a competitive programming platform where developers compete in real-time "Battle Royale" rooms. Users join a room, receive a coding problem, and race to pass all test cases first.

## 🏗 Architecture
This project uses a **Hybrid Architecture** to balance development speed with performance and control.

### 1. The Stack
*   **Frontend:** React + Vite (Fast UX), Monaco Editor (Pro coding experience).
*   **Backend:** Node.js + Express (API Proxy), Socket.io (Real-time Game State).
*   **Database & Auth:** Supabase (PostgreSQL + JWT Auth).
*   **Execution Engine:** Judge0 (Sandboxed Code Execution).

### 2. Data Flow
1.  **Auth:** Client authenticates directly with **Supabase Auth**.
2.  **Lobby:** Client connects to **Node.js/Socket.io** server to join a Room.
3.  **The Battle:**
    *   Node.js server fetches a Problem (and hidden test cases) from **Supabase DB**.
    *   Users submit code to Node.js server.
    *   Node.js server bundles [User Code] + [Hidden Inputs] -> sends to **Judge0**.
    *   **Judge0** executes securely and returns results.
    *   Node.js broadcasts results ("Player A passed 3/5 tests") via Socket.io to the room.

## 📂 Project Structure
*   `/frontend` - React Application
*   `/backend` - Node.js Express & Socket.io Server
*   `/docs` - Architectural documentation and dev logs

## 🛡 Security & Design Decisions
*   **Hidden Test Cases:** The frontend *never* receives the test cases or expected outputs. Verification happens strictly server-side.
*   **Sandboxing:** Arbitrary code is never run on the application server; it is offloaded to the isolated Judge0 environment.
