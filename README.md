# FunaGig v2.5 - Modern Student-Business Gig Marketplace

**Status:** ✅ Production-Ready | **Version:** 2.5 | **Architecture:** React + Vite + Supabase

FunaGig is a modern gig marketplace platform connecting students with businesses for short-term work opportunities. It enables students to find flexible gigs and allows businesses to hire talented students securely. Version 2.5 represents a complete architectural overhaul from a legacy PHP/Node.js stack to a modern **Serverless React application powered by Supabase**.

---

## 🎯 Core Features

- **Role-Based Authentication:** Secure Login and Signup for both Students and Businesses.
- **Gig Management:** Businesses can post, edit, pause, and delete gigs.
- **Application System:** Students can apply to gigs. Businesses can review, accept, or reject applications.
- **Real-Time Messaging (Instagram-style):** Instant WebSocket-based chat between businesses and students, featuring typing indicators, read receipts, and bubble UI.
- **Profile Management:** Users can update their skills, universities, industries, and profile avatars.
- **Dark Mode UI:** Modern, responsive AMOLED dark mode interface using CSS variables and modern design tokens.

---

## 🏗️ How the Backend is Handled (The Supabase Magic)

Unlike traditional applications that require a custom backend server (like Node.js + Express or PHP), **FunaGig v2.5 is completely serverless.** It uses **Supabase** as a fully managed Backend-as-a-Service (BaaS). 

Here is how the backend logic is handled without writing a custom server:

1. **Database (PostgreSQL):** All data (users, gigs, applications, conversations) is stored in a remote PostgreSQL database hosted on Supabase.
2. **Authentication (GoTrue):** User signups, logins, and session management are handled by Supabase Auth. A secure PostgreSQL Trigger automatically creates a public profile row in the `users` table the moment an account is registered.
3. **Direct Client-to-Database Communication:** The React frontend uses the `@supabase/supabase-js` library to query the database directly using PostgREST. No middleware APIs are needed.
4. **Security via RLS:** Because the frontend queries the database directly, security is handled via **Row Level Security (RLS)** in PostgreSQL. Strict policies dictate exactly what each user can `SELECT`, `INSERT`, or `UPDATE` mapping to their `auth.uid()`.
5. **Real-Time Data:** The Messaging system uses Supabase Realtime (WebSockets) to subscribe to `postgres_changes`. When a message is inserted into the database, it is instantly pushed to the recipient's React app.
6. **File Storage:** Attachments and Profile Pictures are uploaded directly from the browser to Supabase Storage Buckets.

---

## 📁 Project Structure

```text
funagig2.5/
├── src/
│   ├── components/            # Reusable UI elements (Avatar, Navbar, Sidebar)
│   ├── context/               # React Contexts (AuthContext for global session state)
│   ├── layouts/               # Layout wrappers (StudentLayout, BusinessLayout)
│   ├── pages/
│   │   ├── auth/              # Login, Signup, ForgotPassword
│   │   ├── student/           # Student interfaces (Dashboard, Gigs, Messaging)
│   │   └── business/          # Business interfaces (Dashboard, ManageGigs, Messaging)
│   ├── utils/
│   │   └── supabase.js        # Supabase client initialization
│   ├── App.jsx                # Core application routing
│   ├── index.css              # Reset and utility classes
│   └── modern-theme.css       # The core Design System and Dark Mode styling
├── database.sql               # Complete PostgreSQL schema and views
├── index.html                 # Vite entry point
├── package.json               # NPM dependencies
└── vite.config.js             # Vite configuration
```

---

## 🚀 Local Development Setup

To run this project locally:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase project credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

---

## ☁️ Deployment Guide

Because FunaGig uses a BaaS architecture, deploying to production is incredibly simple:

1. **Deploy the Frontend:**
   - Push your code to GitHub.
   - Connect your repository to a static hosting provider like **Vercel** or **Netlify**.
   - Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Environment Variables settings in the Vercel/Netlify dashboard.
   - Deploy! Vercel/Netlify will build the React app and host the static files globally.

2. **The Backend is Already Live:**
   - Since Supabase is a cloud-hosted database, your backend is already deployed. The live frontend will securely connect to it. No database provisioning or server maintenance is required.
