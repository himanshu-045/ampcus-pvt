# PricePulse — Auth System

## Project Structure

```
pricepulse/
├── backend/
│   ├── controllers/
│   │   └── authController.js    # Signup, Login, Logout, GetMe, RefreshToken
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT protect + RBAC authorize
│   ├── models/
│   │   └── User.js              # Mongoose schema + bcrypt pre-save hook
│   ├── routes/
│   │   └── authRoutes.js        # Rate limiting + express-validator rules
│   ├── utils/
│   │   └── jwt.js               # Token generation & verification
│   ├── server.js
│   ├── package.json
│   └── .env.example             # Copy to .env and fill in values
│
└── frontend/
    └── index.html               # Login/Signup page (standalone HTML)
```

---

## Quick Setup

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env — set your MONGO_URI and JWT_SECRET

# Start server
npm run dev       # dev (with nodemon)
npm start         # production
```

### 2. Frontend

Open `frontend/index.html` directly in a browser, **or** serve it with any static server:

```bash
cd frontend
npx serve .
# or
python3 -m http.server 3000
```

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Register a new user |
| POST | `/api/auth/login` | ❌ | Login and get JWT |
| POST | `/api/auth/logout` | ✅ | Invalidate session cookie |
| GET | `/api/auth/me` | ✅ | Get current user profile |
| POST | `/api/auth/refresh-token` | ❌ | Refresh access token |
| GET | `/api/health` | ❌ | Health check |

---

## Security Features

- **bcryptjs** with 12 salt rounds for password hashing
- **JWT** access tokens (7d) + refresh tokens (30d)
- **HttpOnly cookie** to prevent XSS token theft
- **Rate limiting** — 10 auth attempts per 15 minutes per IP
- **Account lockout** — 5 failed attempts → 15-minute lock
- **RBAC** — `user`, `admin`, `analyst` roles via `authorize()` middleware
- **Input validation** via express-validator (email format, password rules)
- **User enumeration prevention** — same error for "not found" and "wrong password"
- **SameSite cookie** for CSRF protection

---

## Protecting Routes (Example)

```js
const { protect, authorize } = require('./middleware/authMiddleware');

// Any logged-in user
router.get('/dashboard', protect, dashboardController);

// Admin only
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

// Admin or Analyst
router.get('/reports', protect, authorize('admin', 'analyst'), getReports);
```

---

## Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
