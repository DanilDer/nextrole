# NextRole — AI Resume & Job Tracker Platform

NextRole is a full-stack web application that helps job seekers manage their job search. Users can upload resumes, track job applications through their lifecycle, schedule interviews, and get AI-powered feedback on how well their resume matches a job description.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Vanilla CSS |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL |
| AI | Google Gemini API (gemini-1.5-flash) |
| Auth | JWT + bcryptjs |
| File Handling | Multer + pdf-parse |

---

## Project Structure

```
nextrole/
├── client/               # React frontend
│   └── src/
│       ├── api/          # Fetch wrapper (auto-attaches JWT)
│       ├── components/   # Shared UI: Layout, Navbar, Button, Card, Badge, Input
│       ├── context/      # AuthContext — user session + token management
│       └── pages/        # Login, Register (feature pages added by teammates)
├── server/               # Express backend
│   ├── config/           # DB connection pool, Gemini client
│   ├── controllers/      # Auth, job applications, AI analysis logic
│   ├── middleware/        # JWT verification
│   └── routes/           # Auth, job applications, AI analysis routes
└── database/
    └── schema.sql        # PostgreSQL schema + sample data
```

---

## Database Schema

| Table | Description |
|---|---|
| `users` | Registered accounts |
| `resumes` | Uploaded resume versions per user |
| `job_applications` | Jobs tracked: company, role, status, notes |
| `interviews` | Interview rounds linked to an application |
| `ai_analysis` | Gemini ATS score + feedback per resume/job pair |

---

## API Endpoints

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT |

### Job Applications
| Method | Route | Description |
|---|---|---|
| GET | `/api/applications` | List user's applications |
| POST | `/api/applications` | Create new application |
| GET | `/api/applications/:id` | Get single application |
| PUT | `/api/applications/:id` | Update application |
| DELETE | `/api/applications/:id` | Delete application |

### AI Analysis
| Method | Route | Description |
|---|---|---|
| POST | `/api/analysis` | Upload PDF resume + job description → returns ATS score, missing keywords, feedback |

> All routes except register/login require `Authorization: Bearer <token>` header.

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (running locally)
- Google Gemini API key — [get one free here](https://aistudio.google.com/app/apikey)

### 1. Clone the repo

```bash
git clone https://github.com/DanilDer/nextrole.git
cd nextrole
```

### 2. Set up the database

```bash
psql -U <your-postgres-user> -d postgres -c "CREATE DATABASE nextrole;"
psql -U <your-postgres-user> -d nextrole -f database/schema.sql
```

### 3. Configure the backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```
PORT=5001
JWT_SECRET=any_random_secret_string
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nextrole
DB_USER=<your-postgres-username>
DB_PASSWORD=<your-postgres-password>
GEMINI_API_KEY=<your-gemini-api-key>
```

Install dependencies and start:
```bash
npm install
node index.js
```

Server runs on `http://localhost:5001`.

> **macOS users:** Port 5000 is taken by AirPlay Receiver. Use port 5001 (already set above).

### 4. Configure the frontend

```bash
cd client
```

Create `client/.env`:
```
VITE_API_URL=http://localhost:5001
```

Install dependencies and start:
```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Branches

| Branch | Owner | Description |
|---|---|---|
| `main` | — | Stable, merged code |
| `feature/frontend-auth-layout` | Frontend | Auth pages, routing, layout, navbar, shared components |
| `feature/job-applications-backend` | Backend | Job applications CRUD API |

> **Merge note:** When merging both feature branches into main, `server/index.js` will have a conflict. The resolved version should include the CORS middleware, port 5001, and the `/api/applications` route.

---

## Shared Frontend Components

Teammates building feature pages can import these from `client/src/components/`:

| Component | Usage |
|---|---|
| `<Layout />` | App shell — already wired into the router |
| `<Navbar />` | Auto-rendered by Layout |
| `<Button variant="primary\|secondary\|danger\|ghost" size="sm\|md\|lg">` | Buttons |
| `<Card>` | Content container |
| `<Badge status="applied\|interview\|offer\|rejected">` | Status pill |
| `<Input label="" id="" name="" value onChange error />` | Form fields |

---

## Team

Capstone project — full-stack AI-powered job tracker.
