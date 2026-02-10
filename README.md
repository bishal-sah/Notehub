# NoteHub — Academic Notes Sharing Platform

NoteHub is a full-stack academic notes-sharing platform designed to help students across all faculties collaborate by uploading, browsing, and downloading organized academic notes. It features role-based access, admin approval workflows, AI-powered duplicate detection, and semantic search.

---

## Tech Stack

### Backend
- **Python 3.11+** / **Django 4.2** / **Django REST Framework**
- **PostgreSQL** (default, SQLite for dev)
- **JWT Authentication** via `djangorestframework-simplejwt`
- **Swagger/OpenAPI** docs via `drf-spectacular`
- **scikit-learn** for AI features (TF-IDF duplicate detection, semantic search)

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast dev/build
- **Tailwind CSS** with **ShadCN UI** (Radix primitives)
- **React Router v6** for SPA routing
- **Axios** for API calls
- **Lucide React** for icons

---

## Project Structure

```
NoteHub/
├── backend/
│   ├── apps/
│   │   ├── academics/      # Faculty, Semester, Subject models & APIs
│   │   ├── dashboard/      # User & admin dashboard analytics
│   │   ├── notes/          # Note CRUD, approval workflow, AI services
│   │   └── users/          # Custom User, auth, notifications
│   ├── config/             # Django settings, urls, wsgi, asgi
│   ├── manage.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # Navbar, Footer, DashboardLayout, ProtectedRoute
│   │   │   └── ui/         # ShadCN components (button, card, badge, etc.)
│   │   ├── context/        # AuthContext (JWT auth state)
│   │   ├── lib/            # api.ts, services.ts, utils.ts
│   │   ├── pages/
│   │   │   ├── admin/      # Admin dashboard, approvals, users, settings, etc.
│   │   │   ├── dashboard/  # User dashboard, upload, my notes, profile, etc.
│   │   │   └── public/     # Landing, login, register, browse, about, 404, etc.
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx         # Root component with routing
│   │   ├── main.tsx        # Entry point
│   │   └── index.css       # Tailwind + global styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md
```

---

## Features

### Public
- **Landing Page** — Hero, features overview, stats, CTA
- **Browse Notes** — Filter by faculty, subject; sort by date, views, downloads; paginated
- **Note Detail** — Full metadata, download button, report functionality
- **Faculties** — Browse all faculties with semester/subject info
- **About** — Platform mission, values, and feature details
- **Auth** — Login, Register, Forgot Password

### User Dashboard
- **Dashboard** — Stats overview (total notes, views, downloads), recent uploads
- **Upload Notes** — Form with file upload, faculty/subject selection, progress indicator
- **My Notes** — List with edit/delete, status badges (pending/approved/rejected)
- **Edit Note** — Update title, description, subject, or replace file
- **Profile** — Edit personal info, avatar upload
- **Change Password** — Secure password update form
- **Notifications** — Real-time notification feed with mark-read actions

### Admin Dashboard
- **Admin Dashboard** — Platform-wide stats (users, notes, views, downloads)
- **Pending Approvals** — Review, approve, or reject uploaded notes with reasons
- **All Notes** — Search and browse all notes with status filtering
- **User Management** — View users, toggle active/inactive status
- **Faculty Management** — CRUD operations for faculties
- **Duplicate Detection** — AI-powered similarity scanning with configurable threshold
- **Reports** — View and resolve reported notes
- **Settings** — Platform configuration (registration, approval, file limits)

### AI Features
- **Duplicate Detection** — TF-IDF cosine similarity to find duplicate uploads
- **Semantic Search** — Natural language search across note titles and descriptions

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (optional, SQLite works for development)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env with your database and secret key settings

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`.
Swagger docs at `http://localhost:8000/api/docs/`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173/`.
The Vite dev server proxies `/api` requests to the Django backend.

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login (returns JWT) |
| POST | `/api/auth/logout/` | Logout (blacklist refresh) |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET/PATCH | `/api/auth/profile/` | Get/update user profile |
| POST | `/api/auth/change-password/` | Change password |
| GET | `/api/auth/notifications/` | List notifications |

### Academics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/academics/faculties/` | List faculties |
| GET | `/api/academics/semesters/` | List semesters |
| GET | `/api/academics/subjects/` | List subjects |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes/` | Browse approved notes |
| GET | `/api/notes/:slug/` | Note detail |
| POST | `/api/notes/:slug/download/` | Download note |
| GET | `/api/notes/search/` | Semantic search |
| POST | `/api/notes/user/upload/` | Upload note |
| GET | `/api/notes/user/my-notes/` | User's notes |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes/admin/pending/` | Pending approvals |
| POST | `/api/notes/admin/:id/approve/` | Approve/reject note |
| GET | `/api/notes/admin/duplicates/` | Duplicate detection |
| GET | `/api/dashboard/admin/` | Admin analytics |

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Guest** | Browse notes, view details |
| **User** | Upload, download, manage own notes, report |
| **Admin** | Approve/reject notes, manage users/faculties, view analytics |

---

## License

This project is developed as a final-year academic project.
