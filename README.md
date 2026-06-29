# ⚡ TypeBolt

[![TypeBolt CI](https://github.com/invincible1786/typebolt/actions/workflows/ci.yml/badge.svg)](https://github.com/invincible1786/typebolt/actions/workflows/ci.yml)

**TypeBolt** is a fast and engaging typing speed test web application built with a **React** frontend and a **Node.js/Express** backend. It allows users to take 60-second typing tests on dynamic paragraphs and tracks performance across metrics like WPM, accuracy, and history — all visualized in a user-friendly dashboard.

---

## 🎯 Features

### 📈 Typing Performance
- Real-time typing test with WPM and accuracy calculation
- Tracks:
  - Highest WPM
  - Average WPM
  - Accuracy percentage
  - Errors
  - Full test history

### 🔐 Authentication & Persistence
- JWT-based user authentication (signup/login)
- MongoDB-backed storage using Mongoose
- Personalized dashboard with persistent history

### 🌐 Fullstack Integration
- Frontend built in **React**
- Backend built with **Node.js + Express**
- Axios for API communication
- CORS setup for seamless frontend-backend interaction

### 🧠 Smart UX/UI
- Live error highlighting and typing feedback
- Responsive layout for desktop and mobile
- Clean dashboard with user stats

---

## 🚀 Getting Started

### 📦 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (Atlas or local)

---

### 🔧 Clone & Install

```bash
git clone https://github.com/invincible1786/typebolt.git
cd typebolt 
```

### ⚙️ Backend Setup

```bash
cd backend
npm install
npm run dev
```
### Setup /backend/.env

```bash
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
``` 
### ⚙️ Frontend Setup

```bash
cd ../frontend
npm install
npm start
```
---

## 📁 File Structure
```markdown
typebolt/
├── backend/
│ ├── models/ # Mongoose schemas for User and Typing data
│ ├── routes/ # Auth and typing routes
│ ├── middleware/ # Auth middlewares (JWT, errors)
│ ├── server.js # Express entry point
│ └── .env # Backend environment variables
│
└── frontend/
├── src/
│ ├── components/ # Reusable UI components
│ ├── pages/ # Login, Signup, Dashboard, Test
│ └── App.js # Main app logic
└── .env # Frontend API URL
```

