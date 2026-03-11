# Cab Booking App

A full-stack cab booking web application built with Next.js, Express, Clerk, and Supabase.

## ✨ Features
- **Next.js 14 (App Router)** & **Tailwind CSS**
- **Clerk Authentication** (Email, Password, Google)
- **Role-Based Onboarding** (Rider or Driver)
- **Express Backend** with JWT verification
- **Supabase PostgreSQL** for data persistence
- **Premium UI** with glassmorphism and animations

## 📁 Project Structure
```
├── frontend/    # Next.js Application
├── backend/     # Express API
├── package.json # Root management
└── README.md
```

## 🛠️ Setup

### 1. Prerequisites
- Node.js installed
- A Clerk account ([clerk.com](https://clerk.com))
- A Supabase project ([supabase.com](https://supabase.com))

### 2. Database Initialization
Run the SQL from `backend/db/schema.sql` in your Supabase SQL Editor.

### 3. Environment Variables
- **Backend**: Create `backend/.env` using `backend/.env.example`.
- **Frontend**: Create `frontend/.env.local` using `frontend/.env.example`.

### 4. Installation & Running
From the root directory:

```bash
# 1. Install all dependencies (Root, Frontend, Backend)
npm run install-all

# 2. Run both apps concurrently
npm run dev
```

The frontend will start at [http://localhost:3000](http://localhost:3000) and the backend at [http://localhost:5000](http://localhost:5000).


## 🚀 Deployment
- **Frontend**: Deploy on Vercel or Netlify.
- **Backend**: Deploy on Render, Railway, or Fly.io.
- **Database**: Already hosted on Supabase.
