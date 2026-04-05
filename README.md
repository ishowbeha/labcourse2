# Stadium Ticket Management System

A complete full-stack **stadium ticket management system** with React + Vite frontend and Node.js + Express backend, using **SQLite** (file-based database - no installation required!).

## 🏗️ Architecture Overview

This project implements a clean separation of concerns with the following layers:

### Backend (Node.js + Express + SQLite)

```
backend/
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   └── server.js        # Application entry point
├── config/
│   └── database.js      # Database configuration & migrations
└── package.json
```

### Frontend (React + Vite)

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── context/         # React Context (Auth)
│   ├── services/        # API services
│   ├── hooks/           # Custom React hooks
│   └── App.jsx          # Main application
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation & Running

**Step 1: Clone and install dependencies**

```bash
git clone https://github.com/ishowbeha/labcourse2.git
cd labcourse2
```

**Step 2: Start the Backend Server** (Terminal 1)

```bash
cd backend
cp .env.example .env    # Create environment file
npm install
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📡 API available at http://localhost:3000/api
```

**Step 3: Start the Frontend** (Terminal 2 - open a NEW terminal)

```bash
cd frontend
npm install
npm run dev
```

You should see:
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

**Step 4: Open your browser**

Go to: **http://localhost:5173**

### 🔐 Demo Credentials

| Role  | Email              | Password   |
|-------|--------------------|------------|
| Admin | admin@stadium.com  | admin123   |

### 📡 API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (requires auth)

#### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID

#### Health Check
- `GET /api/health` - Server health check

## 🗄️ Database Schema

The system includes tables for:
- **Users & Authentication** - users, roles, user_roles, permissions, role_permissions, refresh_tokens
- **Stadium Management** - stadiums, sections, matches
- **Ticket System** - tickets, orders, order_items
- **Payments** - payments
- **System** - notifications, settings, audit_logs

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - Real-time WebSocket communication
- **SQLite (better-sqlite3)** - File-based database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time WebSocket communication

## 🔌 Real-Time Features (Socket.IO)

This project implements **real-time communication** using Socket.IO WebSockets, as required for the course.

### Features Implemented:

#### 1. Real-Time Notifications
- **Order Updates**: Users receive instant notifications when their order status changes
- **Ticket Purchases**: Confirmation notifications when tickets are bought
- **System Alerts**: Important system-wide announcements
- **Broadcast Messages**: Admin can send messages to all connected users

#### 2. Live Online Status
- Shows number of currently online users
- Real-time updates when users connect/disconnect
- Green dot indicator in the UI

#### 3. Internal Messaging (Chat)
- Send messages to specific users in real-time
- Typing indicators
- Message delivery confirmations
- Messages saved to database

#### 4. Browser Notifications
- Desktop notifications for important events
- Permission-based (user must allow)

### How It Works:

1. **WebSocket Connection**: When a user logs in, the frontend establishes a WebSocket connection to the server using Socket.IO
2. **Authentication**: The JWT token is sent during the WebSocket handshake for secure authentication
3. **Real-Time Events**: The server can push notifications to specific users or broadcast to all users
4. **Automatic Reconnection**: Socket.IO automatically handles reconnection if the connection drops

### Testing Real-Time Features:

1. Start both backend and frontend servers
2. Log in with admin@stadium.com / admin123
3. Open another browser window/tab and log in with a different user
4. You should see the online count update in real-time
5. The notification bell (🔔) will show real-time notifications

### API Events:

**Client → Server:**
- `send-message` - Send a chat message to another user
- `typing` / `stop-typing` - Typing indicators
- `mark-notification-read` - Mark notification as read

**Server → Client:**
- `notification` - Real-time notification
- `broadcast` - Broadcast message to all users
- `receive-message` - Incoming chat message
- `online-users` - Online user count update
- `user-typing` - Typing indicator from another user

## 🔧 Troubleshooting

### Login doesn't work / Nothing happens when I click Sign In

1. **Make sure the backend is running** - Open a terminal and check if you see:
   ```
   🚀 Server running on port 3000
   ```
   If not, run `cd backend && npm run dev`

2. **Check the browser console** - Press F12 and look at the Console tab for errors

3. **Check Network tab** - Press F12, go to Network tab, try logging in again, and look for failed requests

4. **Verify backend is responding** - Open http://localhost:3000/api/health in your browser. You should see:
   ```json
   {"success":true,"message":"Server is running",...}
   ```

### "Cannot find module" errors

Run `npm install` in both `backend/` and `frontend/` directories.

### Port already in use

If port 3000 or 5173 is already in use, you can change them:
- Backend: Set `PORT=3001` in `backend/.env`
- Frontend: Change `port: 5173` to `port: 5174` in `frontend/vite.config.js`

## 🏟️ Features

- **Role-based Authentication** - Login/register with 10 different user roles
- **Admin Dashboard** - Full admin panel for managing the system
- **Ticket Management** - Purchase, view, and manage stadium tickets
- **Match Scheduling** - Create and manage football matches
- **Stadium Management** - Manage stadiums and seating sections
- **Order Processing** - Handle ticket orders and payments

## 📄 License

MIT