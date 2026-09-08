# ⚡ TypeBolt

**A high-throughput fullstack typing speed platform and real-time keystroke telemetry engine.** Built with React 18, Node.js/Express, MongoDB, Redis, and Vite. Features server-side anti-cheat score recomputation, multi-category challenge banks (prose, real code syntax, punctuation drills), dual-axis telemetry progression curves, and a sub-millisecond Redis sorted-set global leaderboard with automatic MongoDB aggregation fallback.

[![TypeBolt CI](https://github.com/invincible1786/typebolt/actions/workflows/ci.yml/badge.svg)](https://github.com/invincible1786/typebolt/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-Build%20Tool-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Redis](https://img.shields.io/badge/Redis-Sorted%20Sets%20%26%20Cache-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%207-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📑 Table of Contents

- [Key Engineering Decisions & Trade-Offs](#-key-engineering-decisions--trade-offs)
- [System Architecture](#-system-architecture)
- [Core Features](#-core-features)
- [Project Directory Structure](#-project-directory-structure)
- [REST API Reference](#-rest-api-reference)
- [Local Development Setup](#-local-development-setup)
- [Docker & Containerized Deployment](#-docker--containerized-deployment)
- [Database & Cache Seeding](#-database--cache-seeding)
- [Automated Testing Suite](#-automated-testing-suite)
- [Engineering Reflection & Future Roadmap](#-engineering-reflection--future-roadmap)
- [License](#-license)

---

## ⚖️ Key Engineering Decisions & Trade-Offs

| Engineering Challenge | Naive Approach | TypeBolt Engineering Solution |
| :--- | :--- | :--- |
| **WPM Computation** | Splitting typed text by spaces (`text.split(' ')`). Short words artificially inflate speed; punctuation and symbol density distort calculations. | Standardized character-based formula: `(typedCharacters / 5) / (seconds / 60)`. Client live HUD and server validation are strictly unified on the 5-character word standard. |
| **Anti-Cheat Validation** | Client calculates WPM locally and sends the computed score directly to the server, creating a trivial client-trust vulnerability. | Client submits only raw keystroke counts, mistyped character counts, and elapsed timestamps. The server independently recomputes Net WPM and accuracy before persisting to the database; anomalies trigger audit warnings. |
| **Leaderboard Ingestion** | Full-collection scans or unindexed MongoDB aggregations on every request ($O(N \log N)$), causing database contention under load. | Redis Sorted Sets (`ZADD` / `ZREVRANGE`) yielding $O(\log N)$ score updates and sub-millisecond ranking queries, backed by an indexed MongoDB aggregation pipeline fallback with zero downtime if Redis is cold or unreachable. |
| **Challenge Text Latency** | Querying third-party public quote APIs on demand during test loops, introducing network latency, rate limits, or SSL handshake timeouts. | Multi-category paragraph banks (`prose`, `code`, `punctuation`) cached in Redis with zero external runtime dependencies. Fallbacks are instantly served from memory. |
| **Database Schema Hygiene** | Using the Mongoose reserved keyword `errors`, generating runtime model warnings and schema collisions. | Migrated schema to `errorCount` with backward-compatible virtual getters/setters, plus compound indexes on `{ user: 1, timestamp: -1 }` (history) and `{ wpm: -1, timestamp: -1 }` (leaderboard aggregation). |
| **Frontend Tooling & Bundling** | Legacy Create React App (`react-scripts 5.0.1`) with slow cold starts, heavy bundle footprints, and high HMR latency. | Migrated to Vite for sub-100ms Hot Module Replacement, optimized ESM production chunks, and high-performance Recharts telemetry visualization. |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React 18 + Vite)                 │
│  - Live Keystroke Engine & HUD    - Second-by-Second Telemetry│
│  - Code / Prose / Symbol Modes    - Recharts Performance Curve│
│  - Auth Context & Protected Routes- High-Contrast Terminal UI │
└───────────────┬─────────────────────────────▲───────────────┘
                │ REST API                    │ Telemetry Data
┌───────────────▼─────────────────────────────┴───────────────┐
│                 API Gateway (Express 4.18)                  │
│  - Helmet Security Headers        - Zod Runtime Validation  │
│  - Scoped Route Rate Limiters     - Anti-Cheat Recomputation│
│  - JWT Bearer Authentication      - Centralized Error Handler│
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
       ┌────────▼────────┐           ┌────────▼────────┐
       │   Redis Cache   │           │ MongoDB (Mongoose)
       │ - Sorted Sets   │           │ - Users Collection
       │   (leaderboard) │           │ - Typing Results
       │ - Category Pools│           │   (Compound Index)
       │ - Auto-Fallback ◄───────────┤ - Aggregation   │
       └─────────────────┘           └─────────────────┘
```

---

## ⚡ Core Features

- **Multi-Category Challenges**:
  - 📖 **Prose Mode**: Curated quotes on software engineering principles, simplicity, and distributed systems architecture.
  - 💻 **Code Mode**: Authentic syntax challenges across JavaScript, TypeScript, Python, Go, Rust, and SQL.
  - 🔣 **Punctuation Drills**: Symbol-dense challenges containing brackets, regex patterns, shell commands, and JSON structures.
- **Configurable Timer Intervals**: Switch dynamically between **15s**, **30s**, **60s**, and **120s** test durations.
- **Real-Time Keystroke Engine**: Character-by-character colorization (correct, incorrect, current cursor), backspace error correction, and instant HUD updates.
- **Server-Side Anti-Cheat**: Raw keystroke counts and timestamps are validated and recalculated on the server (`(characters / 5) / (seconds / 60)`).
- **Dual-Axis Telemetry Progression Curve**: Post-test analytics display an interactive Recharts area graph rendering second-by-second WPM acceleration and accuracy consistency.
- **Resilient Global Leaderboard**: Powered by Redis Sorted Sets (`leaderboard:global`) for sub-millisecond ranking queries, featuring podium badges (#1 Gold, #2 Silver, #3 Bronze) and automatic fallback to indexed MongoDB aggregations.
- **Comprehensive User Dashboard**: Lifetime statistics (Personal Best WPM, Average WPM, Overall Accuracy %, Total Tests Completed) alongside paginated historical test runs.
- **Production-Grade Security**: Scoped rate limiters on registration, login, and test submissions; Zod schema validation; bcrypt password hashing; and Helmet HTTP protection.

---

## 📂 Project Directory Structure

```text
typebolt/
├── .github/
│   └── workflows/
│       └── ci.yml              # Automated CI workflow (Node 20, Lint, Tests, Vite Build)
├── backend/
│   ├── config/
│   │   ├── db.js               # MongoDB Mongoose connection setup
│   │   ├── redis.js            # Redis client creation & auto-reconnection logic
│   │   └── validateEnv.js      # Zod validation schema for environment variables
│   ├── controllers/
│   │   ├── authController.js   # Handlers for /register and /login
│   │   └── typingController.js # Handlers for /paragraph, /typing-result, /history, /stats, /leaderboard
│   ├── middlewares/
│   │   ├── auth.js             # JWT bearer verification middleware
│   │   ├── errorHandler.js     # Centralized error handler with standardized JSON payloads
│   │   └── rateLimiter.js      # Scoped rate limiters for auth and submission routes
│   ├── models/
│   │   ├── TypingResult.js     # Mongoose schema with compound indexes and backwards-compatible virtuals
│   │   └── User.js             # Mongoose schema for user credentials
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   └── typing.js           # Typing challenge, submission, and analytics routes
│   ├── scripts/
│   │   └── seed.js             # Database & Redis seeder with realistic typists and historical runs
│   ├── services/
│   │   ├── authService.js      # Authentication, password hashing, and token issuance
│   │   ├── cacheService.js     # Resilient Redis wrapper (get, set, del, zAdd, zRevRange)
│   │   └── typingService.js    # Anti-cheat recomputation, aggregation pipelines, and fallback logic
│   ├── tests/
│   │   ├── setup.js            # Jest in-memory MongoDB server lifecycle
│   │   ├── auth.test.js        # Auth suite: registration, duplicate checks, login, JWT validation
│   │   ├── typing.test.js      # Typing suite: anti-cheat, stats aggregation, leaderboard fallback
│   │   └── utils.test.js       # Accuracy utility edge-case tests
│   ├── utils/
│   │   ├── accuracy.js         # Accuracy calculation utility
│   │   └── customErrors.js     # Typed HTTP error classes (Validation, Auth, Conflict, NotFound)
│   ├── validators/
│   │   └── authValidators.js   # Zod input schemas for user registration and authentication
│   ├── Dockerfile              # Container configuration for backend API
│   ├── package.json            # Backend dependencies and test scripts
│   └── server.js               # Express application entry point & health check
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Top navigation with user status and logout action
│   │   │   └── Navbar.css      # Header styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global auth provider (user, JWT token, login, logout)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Performance dashboard (lifetime metrics, history, leaderboard)
│   │   │   ├── Login.jsx       # User authentication page
│   │   │   ├── Register.jsx    # User registration page
│   │   │   └── TypingTest.jsx  # Real-time typing engine, HUD, and Recharts telemetry graph
│   │   ├── utils/
│   │   │   ├── api.js          # Axios client with JWT Authorization interceptor
│   │   │   └── typingUtils.js  # WPM, accuracy, speed tier, and time formatting helpers
│   │   ├── App.jsx             # React Router v6 routing and protected route guards
│   │   └── index.jsx           # React 18 DOM mount point
│   ├── Dockerfile              # Multi-stage build (Node build -> Nginx Alpine SPA)
│   ├── nginx.conf              # Production Nginx configuration with SPA fallback routing
│   ├── package.json            # Frontend dependencies and Vite build scripts
│   └── vite.config.mjs         # Vite configuration with React plugin and dev proxy
├── docker-compose.yml          # Multi-container orchestration (MongoDB, Redis, Backend, Frontend)
├── PROJECT_DOCUMENTATION.md    # In-depth architectural specification and reference guide
└── README.md                   # Repository README
```

---

## 📡 REST API Reference

### Public Endpoints

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` or `/api/health` | Service health check verifying MongoDB and Redis connection status | Unrestricted |
| `GET` | `/api/paragraph?category=prose` | Fetch challenge text (`prose`, `code`, or `punctuation`) | Unrestricted |
| `GET` | `/api/leaderboard?limit=10` | Global top typist leaderboard (queries Redis sorted set with MongoDB fallback) | Unrestricted |

#### Health Check Response (`/health`):
```json
{
  "status": "ok",
  "services": {
    "db": "connected",
    "redis": "connected"
  }
}
```

---

### Authenticated Endpoints

> All authenticated routes require the header: `Authorization: Bearer <JWT_TOKEN>`

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account (`username`, `email`, `password`) | 5 requests / 15m |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT bearer token | 10 requests / 15m |
| `POST` | `/api/typing-result` | Submit test results with raw character counts for server recomputation | 20 submissions / 5m |
| `GET` | `/api/typing-history?page=1&limit=8` | Paginated personal test history for the authenticated user | Standard |
| `GET` | `/api/user-stats` | Aggregated user metrics (total tests, best WPM, avg accuracy, avg WPM) | Standard |

#### Sample Result Submission Payload (`POST /api/typing-result`):
```json
{
  "typedText": "Simplicity is prerequisite for reliability...",
  "timeTaken": 60,
  "errorCount": 2,
  "paragraph": "Simplicity is prerequisite for reliability..."
}
```

#### Server Anti-Cheat Recomputed Response:
```json
{
  "message": "Typing result saved successfully",
  "result": {
    "id": "65e8a1b2c3d4e5f6a7b8c9d0",
    "wpm": 84,
    "accuracy": 97.6,
    "errorCount": 2,
    "timeTaken": 60,
    "timestamp": "2026-09-08T04:15:00.000Z"
  }
}
```

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **Redis**: Local Redis server (`redis://localhost:6379`) or an [Upstash Redis](https://upstash.com/) instance

---

### 1. Clone the Repository

```bash
git clone https://github.com/invincible1786/typebolt.git
cd typebolt
```

### 2. Configure Environment Variables

#### Backend Configuration (`backend/.env`):
Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/typebolt
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
CLIENT_URL=http://localhost:3000,http://localhost:5173
```

#### Frontend Configuration (`frontend/.env`):
Create `frontend/.env`:
```env
PORT=3000
REACT_APP_API_URL=http://localhost:5000/api
BROWSER=none
```

---

### 3. Install Dependencies

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

---

### 4. Seed Realistic Leaderboard & Test History (Optional)

Populate your database and Redis cache with realistic typists, test runs, and leaderboard rankings:

```bash
npm run seed --prefix backend
```

> [!TIP]
> Seeded users are created with the default password: `password123`. You can log in immediately as `keystroke_ninja` (`ninja@typebolt.dev`) or `terminal_ace` (`ace@typebolt.dev`).

---

### 5. Run Development Servers

```bash
# Terminal 1: Backend API (port 5000)
npm run dev --prefix backend

# Terminal 2: Frontend (Vite, port 3000)
npm run dev --prefix frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker & Containerized Deployment

TypeBolt is fully containerized with a production-ready **Docker Compose** orchestration setup including automated container healthchecks and dependency sequencing.

```bash
# Build and spin up MongoDB, Redis, Backend, and Frontend containers
docker-compose up --build
```

### Container Services:
| Service | Image / Build Context | Host Port | Internal Port | Healthcheck |
| :--- | :--- | :--- | :--- | :--- |
| `mongodb` | `mongo:latest` | — | `27017` | `mongosh ping` |
| `redis` | `redis:alpine` | — | `6379` | `redis-cli ping` |
| `backend` | `./backend` (Node 20 Alpine) | `5000` | `5000` | `wget /api/health` |
| `frontend` | `./frontend` (Multi-stage Node -> Nginx Alpine) | `80` | `80` | `wget /` |

To stop all containers and preserve database volumes:
```bash
docker-compose down
```

---

## 🧪 Automated Testing Suite

TypeBolt includes **35 unit and integration tests** covering backend authentication, anti-cheat validation, database aggregation, cache fallback, and frontend keystroke mechanics:

```bash
# Run backend test suite (23 Jest tests with in-memory MongoDB)
npm test --prefix backend

# Run frontend test suite (12 React Testing Library tests)
npm test --prefix frontend

# Run backend ESLint check
npm run lint --prefix backend
```

### Test Coverage Highlights:
- **Authentication**: Registration with duplicate prevention, bcrypt hashing verification, JWT token issuance, and protected route access.
- **Anti-Cheat Recomputation**: Validates server recomputation of WPM and accuracy from raw character and error counts.
- **Cache Resilience**: Verifies Redis caching for paragraphs, user statistics, and graceful fallback to MongoDB aggregation when Redis is disconnected.
- **Typing Engine**: Simulates keydown events, timer countdowns, error backspacing, and results rendering.

---

## 💡 Engineering Reflection & Future Roadmap

TypeBolt was designed to explore real-world challenges in low-latency state management, anti-cheat data integrity, and cache resilience. A typing test appears straightforward on the surface, but engineering a production-ready platform surfaces fundamental architectural challenges:

1. **Client-Trust Boundaries**: Browser clients can easily manipulate local variables and submit fabricated high scores. TypeBolt solves this by restricting the client to raw telemetry data while delegating all score and accuracy computation to the server.
2. **Cache Degradation Resilience**: High-velocity leaderboards demand in-memory speed ($O(\log N)$ sorted set operations). However, systems must never crash if the cache cluster becomes unavailable. TypeBolt provides seamless fallback to indexed document aggregation pipelines.

### Future Roadmap
- [ ] **Real-Time Multiplayer Matchmaking**: WebSockets / Socket.io race rooms allowing typists to compete head-to-head in real time.
- [ ] **Finger-Level Error Heatmap**: Interactive virtual keyboard telemetry highlighting which keys and finger transitions cause the highest mistake rates.
- [ ] **Refresh Token Rotation**: Short-lived (15-minute) JWT access tokens paired with Redis-revocable HTTP-only refresh tokens.
- [ ] **Custom Text Imports**: Ability for users to paste and practice customized documentation or code repositories.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
