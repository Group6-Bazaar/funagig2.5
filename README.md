# FunaGig v2.5 - Modern Student-Business Gig Marketplace

**Status:** ✅ Production-Ready | **Version:** 2.5 | **Architecture:** React + Express + PostgreSQL

FunaGig is a modern gig marketplace platform connecting students with businesses for short-term work opportunities. It enables students to find flexible gigs and allows businesses to hire talented students securely. Version 2.5 represents a complete architectural overhaul to a robust **React Single Page Application backed by a custom Node.js Express REST API**.

---

## 🎯 Core Features

- **Role-Based Authentication:** Secure JWT-based Login and Signup for both Students and Businesses.
- **Gig Management:** Businesses can post, edit, pause, and delete gigs.
- **Application System:** Students can apply to gigs. Businesses can review, accept, or reject applications.
- **Real-Time Messaging (Instagram-style):** Instant WebSocket-based chat between businesses and students, featuring typing indicators, read receipts, and bubble UI.
- **Profile Management:** Users can update their skills, universities, industries, and profile avatars.
- **Dark Mode UI:** Modern, responsive AMOLED dark mode interface using CSS variables and modern design tokens.

---

## 🏗️ How the Backend is Handled

FunaGig v2.5 utilizes a custom built 5-tier layered architecture for high performance and maintainability:

1. **Database (PostgreSQL):** All data (users, gigs, applications, conversations) is stored in a robust relational PostgreSQL database.
2. **Authentication:** User signups, logins, and session management are handled by the backend Express server, which encrypts passwords using `bcryptjs` and orchestrates stateless sessions via JSON Web Tokens (JWT).
3. **RESTful API:** The React frontend securely communicates with the backend via a standardized JSON REST API utilizing `fetch`.
4. **Real-Time Data:** The Messaging system uses native WebSockets. When a message is sent to the API, it is processed via a Pub/Sub broker and pushed instantly over the active WebSocket connections to the recipient's React app.
5. **Separation of Concerns:** The application cleanly separates the `client/` (React SPA) from the `server/` (Node/Express API), allowing for independent scaling and deployment.

---

## 📁 Project Structure

```text
funagig2.5/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI elements
│   │   ├── services/          # API fetch wrappers (gigService, authService)
│   │   ├── state/             # Global state hooks (useAppState)
│   │   ├── pages/             # Route views
│   │   └── utils/             # Helper functions
│   ├── index.html             # Vite entry point
│   └── vite.config.js         # Vite configuration
├── server/                    # Express Backend
│   ├── src/
│   │   ├── controllers/       # Route request handlers
│   │   ├── middleware/        # JWT & Validator guards
│   │   ├── repositories/      # Database queries
│   │   ├── routes/            # Express router definitions
│   │   ├── sockets/           # WebSocket real-time broker
│   │   ├── app.js             # Express app instantiation
│   │   └── index.js           # Server entry point
│   └── db/                    # PostgreSQL connection pool
├── database.sql               # Complete PostgreSQL schema
└── package.json               # Root dependencies for running both concurrently
```

---

## 🚀 Local Development Setup

To run this project locally:

1. **Install Dependencies:**
   Run this in the root folder to install dependencies for both the frontend and backend:
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Navigate into the `server/` directory, copy `.env.example` to `.env`, and configure your PostgreSQL database URL and JWT secret:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/funagig
   JWT_SECRET=your_super_secret_key_here
   CLIENT_ORIGIN=http://localhost:5173
   ```

3. **Initialize the Database:**
   Run the `database.sql` script located in the root folder against your local PostgreSQL database to generate the tables (`users`, `gigs`, `applications`, etc.) required by the application.

4. **Start the Development Servers:**
   From the **root folder**, run:
   ```bash
   npm run dev
   ```
   This will use `concurrently` to automatically start both the Express backend on Port 5000 and the Vite React frontend on Port 5173.

---

## ☁️ Deployment Guide

Because FunaGig is separated into a frontend and backend, you will deploy them independently:

1. **Deploy the Frontend (React):**
   - Connect your `client/` directory to a static hosting provider like **Vercel** or **Netlify**.
   - Add the `VITE_API_URL` environment variable pointing to your deployed backend URL.

2. **Deploy the Backend (Express & PostgreSQL):**
   - Deploy your PostgreSQL database to a provider like **Neon**, **Render**, or **AWS RDS**.
   - Deploy your `server/` directory to a Node.js hosting platform like **Render**, **Railway**, or **DigitalOcean App Platform**.
   - Configure the production environment variables (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`) on your hosting platform.
