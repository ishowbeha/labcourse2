# Layered Architecture - Full Stack Application

A complete full-stack application demonstrating a **3-tier layered architecture** with React + Vite frontend and Node.js + Express backend, using **SQLite** (file-based database - no installation required!).

## 🏗️ Architecture Overview

This project implements a clean separation of concerns with the following layers:

### Backend (Node.js + Express + SQLite)

```
backend/
├── src/
│   ├── controllers/     # HTTP request handlers (no business logic)
│   ├── services/        # Business logic and application rules
│   ├── repositories/    # Data access layer (isolates SQL)
│   ├── models/          # Data models
│   ├── routes/          # API route definitions
│   ├── middleware/      # Express middleware
│   └── server.js        # Application entry point
├── config/
│   └── database.js      # SQLite database configuration & migrations
└── package.json
```

### Frontend (React + Vite)

```
frontend/
├── src/
│   ├── components/      # Reusable UI components (Controllers)
│   ├── pages/           # Page components
│   ├── services/        # Business logic layer
│   ├── repositories/    # API data access layer
│   ├── hooks/           # Custom React hooks
│   ├── App.jsx          # Main application component
│   └── main.jsx         # Application entry point
├── index.html
└── package.json
```

## 🎯 Layer Responsibilities

### 1. Controllers (API/Components)
- **Backend**: Handle HTTP requests and return responses
- **Frontend**: Handle UI interactions and display data
- **No business logic** - only request/response handling

### 2. Services
- Contains all **business logic** and application rules
- Orchestrates data flow between controllers and repositories
- Performs validation and data transformation

### 3. Repositories
- Manages all **database communication**
- Isolates SQL from business logic
- Provides clean data access API

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

**That's it!** No MySQL, MongoDB, or other database installation required. SQLite is file-based and automatically set up.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ishowbeha/labcourse2.git
   cd labcourse2
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

3. **Start Backend Server**
   ```bash
   npm run dev
   ```

4. **Setup Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

That's it! The application will automatically create the SQLite database and run migrations on first startup.

## 📡 API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/login` - User login

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Health Check
- `GET /api/health` - Server health check

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **SQLite (better-sqlite3)** - File-based database (no installation needed!)
- **bcryptjs** - Password hashing
- **dotenv** - Environment variables

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client

## 📝 Example Usage

### Creating a User

```javascript
// Frontend
const userService = new UserService();
const newUser = await userService.createUser({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'securepassword123'
});
```

### Creating a Category

```javascript
// Frontend
const categoryService = new CategoryService();
const newCategory = await categoryService.createCategory({
  name: 'Electronics',
  description: 'Electronic devices and gadgets'
});
```

## 🏛️ Architecture Benefits

1. **Separation of Concerns** - Each layer has a specific responsibility
2. **Maintainability** - Easy to modify one layer without affecting others
3. **Testability** - Each layer can be tested independently
4. **Scalability** - Easy to scale different layers independently
5. **Reusability** - Services and repositories can be reused across controllers
6. **No Database Setup** - SQLite is file-based, no installation required!

## 📄 License

MIT