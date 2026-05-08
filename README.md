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

## 🏗️ System Architecture

FunaGig utilizes a 5-tier layered architecture for high performance, maintainability, and clear separation of concerns.

### 1. The 4+1 View Model
The system architecture is designed across five complementary perspectives:
- **Logical View:** Functional decomposition into modules: React Presentation → useAppState → Service Layer → Express API → Repository → PostgreSQL.
- **Process View:** Handles runtime behavior including HTTP REST request-response cycles and real-time WSS WebSocket messaging flow.
- **Development View:** Organizes the codebase into `client/` (Frontend) and `server/` (Backend) with strict internal layering.
- **Physical View:** Deployment topology supporting local development, offline usage, and cloud hosting (Vercel/Render/AWS).
- **+1 (Scenarios):** Validates the architecture through core user journeys like gig applications and real-time chat.

### 2. Layered Architecture (5-Tier)
1. **Presentation Layer (React):** Renders the UI and translates user actions into state changes.
2. **State Module (useAppState):** The single source of truth for client-side state, managing optimistic updates and async workflows.
3. **Service Layer (Client):** Abstracts HTTP/WS communication; each service issues `fetch()` calls to the REST API.
4. **API Layer (Express):** Handles routing, JWT-based authentication, request validation, and business logic.
5. **Data Access Layer (Repositories):** Manages parameterized SQL queries, ensuring the API is decoupled from the database schema.

### 3. Interaction Narrative
The application follows a unidirectional dependency chain. A change to the PostgreSQL schema requires changes only in the Repository layer, never in the React components. The Express API can be refactored independently provided the REST contract is preserved.

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

## 🚀 Local & Offline Development Setup

FunaGig can be run entirely offline on a local machine with a local PostgreSQL instance.

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (installed and running locally)
- **npm** (comes with Node.js)

### 2. Install Dependencies
Run the following in the root folder to install all dependencies for the workspace:
```bash
npm install
npm run install:all
```

### 3. Database Initialization (Offline)
1. Open your terminal and log into your local PostgreSQL: `psql -U postgres`
2. Create the database: `CREATE DATABASE funagig;`
3. Import the schema from the root folder:
   ```bash
   psql -U postgres -d funagig -f database.sql
   ```

### 4. Environment Variables
Navigate to the `server/` directory and create a `.env` file:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/funagig
JWT_SECRET=your_super_secret_key_here
CLIENT_ORIGIN=http://localhost:5173
PORT=5000
```
*Note: Replace `postgres` and `yourpassword` with your local DB credentials.*

### 5. Start Development Servers
From the **root folder**, run:
```bash
npm run dev
```
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---
# ☁️ AWS Deployment Guide: FunaGig v2.5

This guide provides step-by-step instructions for deploying the FunaGig marketplace to Amazon Web Services (AWS) using **RDS (PostgreSQL)**, **Elastic Beanstalk (Node.js)**, and **S3 (Static Website Hosting)**.

---

## 🏗️ Deployment Architecture

- **Frontend:** React SPA hosted on **Amazon S3** (optionally distributed via CloudFront).
- **Backend:** Express API running on **AWS Elastic Beanstalk** (Load Balanced Node.js environment).
- **Database:** Relational data persisted in **Amazon RDS for PostgreSQL**.

---

## 1. 🗄️ Database Setup (Amazon RDS)

### Create the RDS Instance
1. Go to the **RDS Console** and click **Create database**.
2. Select **Standard create** and **PostgreSQL**.
3. Choose the **Free Tier** template (if applicable).
4. **Settings:** Set `DB instance identifier` to `funagig-db`. Set your master username and password.
5. **Connectivity:**
   - Ensure **Public access** is set to **No** (unless you need to access it from your local machine for initial setup; if so, restrict it to your IP).
   - Create a new **VPC security group** named `funagig-rds-sg`.
6. Click **Create database**.

### Initialize the Schema
1. Once the DB is available, note the **Endpoint**.
2. From a machine with access to the RDS instance, run:
   ```bash
   psql -h <rds-endpoint> -U <username> -d postgres -f database.sql
   ```

---

## 2. 🚂 Backend Deployment (AWS Elastic Beanstalk)

### Prepare the Application
1. Navigate to the `server/` directory.
2. Ensure `package.json` has `scripts.start` set to `node src/index.js`.
3. Create a ZIP file of the `server/` directory content (excluding `node_modules`).

### Create Elastic Beanstalk Environment
1. Go to the **Elastic Beanstalk Console** and click **Create application**.
2. **Application name:** `funagig-api`.
3. **Platform:** Node.js (Latest version).
4. **Application code:** Upload your ZIP file.
5. **Configuration:**
   - Go to **Software Configuration**.
   - Add the following **Environment properties**:
     - `DATABASE_URL`: `postgresql://<user>:<password>@<rds-endpoint>:5432/postgres`
     - `JWT_SECRET`: Your long random string.
     - `CLIENT_ORIGIN`: Your S3 bucket URL or CloudFront URL.
     - `PORT`: `8081` (EB default for Node.js is often 8081 or 8080).
6. Click **Create app**.

### Security Group Update
Ensure the RDS security group (`funagig-rds-sg`) allows inbound traffic on port `5432` from the Elastic Beanstalk security group.

---

## 3. 🖥️ Frontend Deployment (Amazon S3)

### Build the React App
1. Navigate to the `client/` directory.
2. Create or update `.env.production`:
   ```env
   VITE_API_URL=http://<your-eb-environment-url>
   ```
3. Run the build command:
   ```bash
   npm run build
   ```
   This generates a `dist/` folder.

### Upload to S3
1. Go to the **S3 Console** and click **Create bucket**.
2. **Bucket name:** `funagig-frontend` (must be globally unique).
3. **Public access:** Uncheck **Block all public access** (since this is a public website).
4. In the bucket **Properties**, enable **Static website hosting**.
   - Index document: `index.html`
   - Error document: `index.html` (important for SPA routing).
5. In the bucket **Permissions**, add a **Bucket Policy** to allow public reads:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::funagig-frontend/*"
       }
     ]
   }
   ```
6. **Upload Content:** Upload the contents of the `client/dist/` folder to the root of the bucket.

---

## 🔗 Final Integration

1. Copy the **S3 Bucket Website Endpoint** (from S3 Properties).
2. Go back to **Elastic Beanstalk Configuration > Software** and update `CLIENT_ORIGIN` with this URL.
3. Your application should now be live!

---

## 🔒 Security Best Practices (Recommended)
- **CloudFront:** Use Amazon CloudFront in front of S3 to enable HTTPS and better performance.
- **ACM:** Use AWS Certificate Manager for free SSL certificates.
- **VPC:** Ensure RDS and Elastic Beanstalk are in the same VPC for private networking.
