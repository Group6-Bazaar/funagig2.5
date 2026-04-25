# ◈ FunaGig — Week 5 Architecture Workbook
**Software Engineering — Architectural Design**

| Field | Detail |
|---|---|
| Project Title | FunaGig — Student-Business Gig Marketplace |
| Course | Software Engineering |
| Organisation | Education / Labour Market Technology — Uganda |
| Architecture | Layered + MVC Hybrid, React SPA + Express REST API |
| Deployment | AWS S3 + CloudFront (Frontend) + AWS EC2/ECS (Backend) + AWS RDS PostgreSQL |



### Activity 2.2 — Architecture in Practice (FunaGig as the System)

**Five Major Components and Their Interactions:**

| Component | Role | Interacts With | Communication Mechanism |
|---|---|---|---|
| React SPA (Frontend) | Renders all UI for Visitor, Student, and Business roles. Manages client-side routing and conditionally renders role-specific dashboards based on `currentUser.role`. | useAppState Hook, react-router-dom | Direct function calls (hook invocation); no network boundary |
| useAppState Hook | Single source of truth for all client-side application state. Exposes `state`, `loading`, `errors`, and `actions` to consuming components. Orchestrates async workflows including optimistic updates and rollback on failure. | Service Layer, React Components | Direct function calls (service module imports); updates propagate via React's reconciler |
| Service Layer (Frontend) | Abstracts all HTTP and WebSocket communication behind stable async function interfaces. Contains `authService`, `gigService`, `applicationService`, `messageService`, `profileService`, and `analyticsService`. Each function issues a `fetch()` call to the Express API and handles response parsing and error normalisation. | Express REST API, useAppState Hook | `fetch()` over HTTPS for REST; native `WebSocket` API for real-time messaging |
| Express REST API (Backend) | A Node.js/Express server that exposes the full REST API for FunaGig. Handles routing, session-based authentication middleware, request validation, business logic, and delegates all data access to the repository layer. Also runs a `ws` WebSocket server for real-time messaging. | Service Layer (Frontend), PostgreSQL DB, ElastiCache (Redis) | HTTPS REST (JSON); WSS WebSocket for messaging |
| PostgreSQL Database | Persists all structured relational data. Tables: `users`, `gigs`, `applications`, `conversations`, `messages`, `analytics_snapshots`. Accessed exclusively via parameterised queries in the Express repository layer — never exposed directly to the frontend. | Express Repository Layer | SQL via `node-postgres` (`pg`) connection pool |

**Interaction Narrative:**

The five components form a unidirectional dependency chain: React Components → useAppState → Service Layer → Express API → PostgreSQL. This strict directionality is architecturally significant. It means that a change to the PostgreSQL schema requires changes only in the Express repository layer (and potentially route handlers), never in React components. It also means that the Express API can be refactored independently without touching any frontend code, provided the REST contract (URL paths, request/response shapes) is preserved. Session state is externalised to AWS ElastiCache (Redis), so multiple Express instances behind a load balancer all share the same session store — this is the key architectural implication of choosing session-based over JWT-based authentication.

---

## Section 3: Architectural Design Decisions

### Activity 3.1 — Key Architectural Decisions

| Decision Area | Our Choice | Alternatives Considered | Reason for Choice |
|---|---|---|---|
| System Type | Web Application (SPA + REST API) | Next.js (SSR), Remix (full-stack), Static site + BaaS | A React SPA + Express REST API cleanly separates the frontend and backend into independently deployable units. Next.js couples frontend and backend in a single deployment, complicating independent scaling. A BaaS eliminates the custom backend but reduces control over business logic and server-side processing. |
| Architecture Style | Layered + MVC Hybrid | Pure MVC, Microservices, Event-Driven Architecture | The Layered pattern separates Presentation, State, Service, API, Repository, and Data concerns for long-term maintainability. MVC is applied within both the React frontend and the Express backend. Microservices were rejected as over-engineered for a student MVP team with a single database. |
| Backend Framework | Express.js (Node.js) | Fastify, NestJS, Koa, Django | Express is the most widely documented Node.js framework, has the largest middleware ecosystem, and is familiar to the team. Its minimalism gives the team full control over the architecture without framework-imposed patterns. NestJS was rejected for adding TypeScript decorator overhead that increases learning complexity for a student team. |
| Deployment | AWS (S3 + CloudFront for Frontend; EC2/ECS for Backend; RDS for Database; ElastiCache for Sessions) | Vercel + Render, Heroku, DigitalOcean | AWS provides a unified cloud environment with fine-grained control over networking (VPC), security (Security Groups, IAM), scaling (Auto Scaling Groups, ECS), and managed services (RDS, ElastiCache). Running everything in a single AWS VPC means the Express server communicates with RDS and ElastiCache over a private internal network, never over the public internet, improving both security and latency. |
| Data Storage | PostgreSQL via node-postgres (AWS RDS) | MongoDB, MySQL, SQLite | FunaGig's core entities — gigs, applications, users, conversations — have well-defined relationships requiring JOIN queries, foreign key constraints, and transactional consistency. AWS RDS for PostgreSQL provides managed backups, automated patching, Multi-AZ failover, and read replicas — capabilities that eliminate manual database operations for the team. |
| Authentication | Session-based (express-session + connect-redis + AWS ElastiCache) | JWT (jsonwebtoken), Auth0, Passport.js | Server-side sessions store the authenticated user's identity in Redis, referenced by a signed, httpOnly session cookie sent with every request. Sessions can be invalidated server-side immediately on logout — a security property JWT alone cannot provide without a denylist. Since session state lives in ElastiCache (shared across all EC2/ECS instances), horizontal scaling is fully supported without sticky sessions. `bcryptjs` hashes passwords before storage. |
| State Management | Custom `useAppState` Hook | Redux Toolkit, Zustand, React Context + useReducer | A single custom hook minimises boilerplate for the MVP. It provides a stable `actions` interface that mirrors the Service Layer's function signatures, making the Controller role explicit without introducing Redux's ceremony. |

---

### Activity 3.2 — Non-Functional Requirements Mapping

| Quality Attribute | ISO 25010 Category | Architectural Support in FunaGig | Measurable Target |
|---|---|---|---|
| Performance | Performance Efficiency | React SPA pre-compiled to ~200KB gzip bundle served from AWS CloudFront CDN edge nodes (sub-50ms TTFB globally). Express uses a `pg` connection pool (max 20 persistent connections per instance) against AWS RDS to eliminate per-request connection overhead. Session lookups hit AWS ElastiCache (Redis) in sub-millisecond time — faster than any database query. PostgreSQL B-tree indexes on `gig_id`, `student_id`, `business_id`, and `status` keep lookups sub-10ms. Analytics are pre-aggregated into `analytics_snapshots`. Optimistic UI updates decouple perceived performance from API latency. | Page load < 3s on 3G; API responses < 200ms p95 |
| Security | Security | `requireAuth` middleware checks `req.session.userId` on every protected route — no session means 401. Passwords hashed with bcryptjs (cost factor 12) before storage in RDS. Controllers enforce resource ownership (`gig.business_id === req.user.id`). All SQL uses parameterised queries — string interpolation is an ESLint error. Session cookies are `httpOnly`, `Secure`, and `SameSite=Strict`, preventing XSS token theft and CSRF. CORS restricts `Access-Control-Allow-Origin` to the CloudFront frontend origin. All traffic within AWS runs inside a private VPC — RDS and ElastiCache are not publicly accessible. AWS ACM provisions and auto-renews TLS certificates for CloudFront and the Application Load Balancer. | Zero unauthorised cross-user data access; HTTPS-only; sessions revocable on logout |
| Availability | Reliability | AWS CloudFront: 99.99% SLA for static frontend CDN. AWS ALB + EC2/ECS Auto Scaling: automatically replaces unhealthy instances, maintaining availability during instance failures. AWS RDS Multi-AZ: synchronous standby replica with automatic failover in < 60s. AWS ElastiCache (Redis) with replication group: automatic failover for session store. All services monitored via AWS CloudWatch with alarm-triggered auto-recovery. | 99.9% uptime; RTO < 60s via Multi-AZ failover |
| Maintainability | Maintainability | Route handlers contain no SQL; repository functions contain no HTTP logic; React components contain no fetch calls. Changing an API endpoint requires only a change in the relevant service file. The Express backend is organised into `routes/`, `controllers/`, `middleware/`, and `repositories/` — navigable without reading implementations. AWS infrastructure is defined as code (CloudFormation or CDK), making environments reproducible and changes auditable via git. | Backend refactor without touching any React component |
| Scalability | Performance Efficiency | React SPA on CloudFront is stateless — scales to unlimited concurrent users automatically. Express servers are effectively stateless from a session-state perspective (sessions live in ElastiCache, not in-process), so AWS Auto Scaling can add EC2/ECS instances horizontally behind the Application Load Balancer without sticky-session requirements. RDS Read Replicas offload read-heavy analytics queries. PostgreSQL supports table partitioning on `gigs` and `applications` for growth beyond 100,000 records. | Support 10,000 concurrent users with Auto Scaling; ElastiCache handles session fan-out |
| Usability | Usability | Loading shimmer states, optimistic UI updates, Toast notifications for all action outcomes, role-based routing, and error recovery actions. | Task completion rate > 90% in usability testing |

---

## Section 4: Architectural Views (4+1 Model)

### Activity 4.1 — Understanding the Views

The 4+1 Architectural View Model (Philippe Kruchten, 1995) describes a system from five complementary perspectives.

| View | Primary Stakeholders | Description | FunaGig Artefact |
|---|---|---|---|
| Logical View | Developers, Architects | Functional decomposition into modules and their relationships. Answers: *what does the system do?* | Module diagram: React Presentation → State → Service → Express API → Repository → PostgreSQL |
| Process View | System Integrators, Performance Engineers | Runtime behaviour and data flows. Answers: *how does the system behave at runtime?* | Sequence diagrams: HTTP request-response and WebSocket message flow |
| Development View | Developers, Build Engineers | Physical source code organisation. Answers: *how is the codebase structured?* | File system: `client/src/`, `server/src/routes`, `server/src/repositories` |
| Physical View | DevOps, Infrastructure Engineers | Deployment topology. Answers: *where does the system run?* | User device → Vercel CDN → Render (Express) → PostgreSQL |
| +1 (Use Case Scenarios) | All stakeholders | Scenarios that validate the other four views. | Student applies, Business posts, Real-time messaging, Analytics |

---

### Activity 4.2 — Applying the 4+1 Views to FunaGig

#### 1. Logical View — System Module Decomposition

```
┌──────────────────────────────────────────────────────────────────────┐
│                     PRESENTATION MODULE (React)                      │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐ │
│  │  Auth Module    │  │  Student Module │  │  Business Module     │ │
│  │ SignIn / SignUp │  │ Dashboard       │  │ Dashboard            │ │
│  │ ForgotPassword  │  │ BrowseGigs      │  │ PostGig              │ │
│  └─────────────────┘  │ MyApplications  │  │ ManageGigs           │ │
│  ┌─────────────────┐  │ Messages        │  │ Applications         │ │
│  │  Visitor Module │  │ Profile         │  │ Analytics / Messages │ │
│  │ Landing         │  └─────────────────┘  └──────────────────────┘ │
│  │ PublicGigs      │                                                 │
│  └─────────────────┘  ┌─────────────────────────────────────────┐   │
│                       │  Shared UI Library                      │   │
│                       │  Toast • Modal • Drawer • Badge         │   │
│                       │  StatCard • SearchBar • Shimmer         │   │
│                       └─────────────────────────────────────────┘   │
└───────────────────────────────┬──────────────────────────────────────┘
                      depends on ▼
┌───────────────────────────────▼──────────────────────────────────────┐
│                      STATE MODULE (useAppState)                      │
│  state{} • loading{} • errors{} • actions{}                         │
│  All async orchestration, optimistic updates, and error recovery     │
└───────────────────────────────┬──────────────────────────────────────┘
                      depends on ▼
┌───────────────────────────────▼──────────────────────────────────────┐
│               CLIENT SERVICE MODULE (fetch / WebSocket)              │
│  authService • gigService • applicationService                       │
│  messageService • profileService • analyticsService                  │
│  Each function: fetch('https://api.funagig.com/...', { headers })    │
└───────────────────────────────┬──────────────────────────────────────┘
                  HTTPS REST + WSS ▼  (network boundary)
┌───────────────────────────────▼──────────────────────────────────────┐
│               EXPRESS API MODULE (Node.js / Express.js)              │
│                                                                      │
│  Middleware: cors() → express.json() → helmet() → requireAuth()      │
│                                                                      │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │  /auth       │  │  /gigs          │  │  /applications       │   │
│  │  POST /signup│  │  GET  /         │  │  POST /              │   │
│  │  POST /login │  │  GET  /:id      │  │  GET  /student/:id   │   │
│  │  POST /logout│  │  POST /         │  │  GET  /gig/:id       │   │
│  │  POST /reset │  │  PATCH /:id     │  │  PATCH /:id/status   │   │
│  └──────────────┘  │  DELETE /:id    │  └──────────────────────┘   │
│                    └─────────────────┘                              │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │  /messages   │  │  /profiles      │  │  /analytics          │   │
│  │  GET  /convs │  │  GET + PATCH    │  │  GET  /business      │   │
│  │  GET  /:id   │  │  /student       │  └──────────────────────┘   │
│  │  POST /send  │  │  /business      │                             │
│  └──────────────┘  └─────────────────┘                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  WebSocket Server (ws)                                      │    │
│  │  Upgrade → verify JWT → join room conv:{id} → broadcast     │    │
│  └─────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬──────────────────────────────────────┘
                      SQL via pg pool ▼
┌───────────────────────────────▼──────────────────────────────────────┐
│               REPOSITORY MODULE (node-postgres)                      │
│  userRepo • gigRepo • applicationRepo                                │
│  messageRepo • profileRepo • analyticsRepo                           │
│  Parameterised queries only — no string interpolation                │
└───────────────────────────────┬──────────────────────────────────────┘
                      TCP (internal) ▼
┌───────────────────────────────▼──────────────────────────────────────┐
│               DATA MODULE (PostgreSQL)                               │
│  users │ gigs │ applications │ conversations │ messages │ analytics  │
│  Indexes on FK columns • Unique constraints • Check constraints      │
└──────────────────────────────────────────────────────────────────────┘
```

**Key architectural constraint:** No React component may import from `services/` directly — only via `useAppState`. No Express route handler may import `pg` directly — only via a repository module. These constraints are enforced by ESLint import boundary rules.

---

#### 2. Process View — Runtime Interaction Scenarios

**Scenario A: Student submits a gig application (HTTP request-response with optimistic update)**

```
Browser      React SPA      useAppState      appService    Express API       PostgreSQL
   │              │               │               │               │               │
   │─[HTTP GET]──►│               │               │               │               │
   │◄─[SPA bundle]│               │               │               │               │
   │              │──[init()]────►│               │               │               │
   │              │               │──[authSvc     │               │               │
   │              │               │   .getUser()]►│               │               │
   │              │               │               │─[GET /auth/me►│               │
   │              │               │               │  Bearer <jwt> │               │
   │              │               │               │               │─[verify JWT]  │
   │              │               │               │               │─[SELECT user]►│
   │              │               │               │               │◄─[user row]───│
   │              │               │               │◄─[200 user{}]─│               │
   │              │               │◄─[currentUser]│               │               │
   │◄─[render UI] │◄─[state]──────│               │               │               │
   │              │               │               │               │               │
   │─[click Apply]►│               │               │               │               │
   │              │──[actions     │               │               │               │
   │              │   .apply()]──►│               │               │               │
   │              │               │ OPTIMISTIC:   │               │               │
   │              │               │ add pending   │               │               │
   │◄─[UI updates]│◄─[state]──────│               │               │               │
   │  immediately │               │──[appSvc      │               │               │
   │              │               │   .create()]─►│               │               │
   │              │               │               │─[POST /apps]─►│               │
   │              │               │               │  Bearer <jwt> │               │
   │              │               │               │               │─[requireAuth] │
   │              │               │               │               │─[validate body│
   │              │               │               │               │─[appRepo      │
   │              │               │               │               │   .create()]─►│
   │              │               │               │               │  INSERT INTO  │
   │              │               │               │               │  applications │
   │              │               │               │               │◄─[new row]────│
   │              │               │               │◄─[201 app{}]──│               │
   │              │               │◄─[application]│               │               │
   │              │               │ CONFIRM:      │               │               │
   │              │               │ replace optim.│               │               │
   │◄─[Toast: OK] │◄─[state]──────│               │               │               │
```

**Scenario B: Real-time message delivery (WebSocket)**

```
StudentBrowser  StudentSPA  useAppState  messageService  Express WS Server  BusinessBrowser
      │              │            │             │                 │                 │
      │  [Open conversation]      │             │                 │                 │
      │              │──[actions  │             │                 │                 │
      │              │   .openConv►│             │                 │                 │
      │              │            │──[msgSvc    │                 │                 │
      │              │            │   .connect()]►│                │                 │
      │              │            │             │─[WS Upgrade]───►│                 │
      │              │            │             │  ?token=<jwt>   │                 │
      │              │            │             │                 │─[verify JWT]    │
      │              │            │             │                 │─[join room      │
      │              │            │             │                 │  conv:{id}]     │
      │              │            │             │◄─[connected]────│                 │
      │              │            │             │                 │  [Business also │
      │              │            │             │                 │   in same room] │
      │─[type + send]►│            │             │                 │                 │
      │              │──[actions   │             │                 │                 │
      │              │   .sendMsg]►│             │                 │                 │
      │              │            │──[msgSvc    │                 │                 │
      │              │            │   .send()]──►│                 │                 │
      │              │            │             │─[POST /messages/│                 │
      │              │            │             │   send]────────►│                 │
      │              │            │             │                 │─[INSERT msg]───►│
      │              │            │             │                 │◄─[row]──────────│
      │              │            │             │                 │─[broadcastToRoom│
      │              │            │             │                 │  conv:{id}]────►│
      │              │            │             │◄─[WS event]─────│                 │
      │              │            │◄─[new msg]──│                 │  [Business SPA  │
      │◄─[msg appears]│◄─[state]───│             │                 │   receives WS   │
      │              │            │             │                 │   event, updates│
      │              │            │             │                 │   state]────────│
```

---

#### 3. Development View — Code Organisation

```
funagig/
│
├── client/                          ← REACT FRONTEND
│   ├── src/
│   │   ├── App.jsx                  ← Root component + route tree
│   │   ├── main.jsx                 ← Vite entry point
│   │   │
│   │   ├── lib/
│   │   │   └── api.js               ← fetch() wrapper: base URL, JWT header,
│   │   │                              error normalisation. Used by all services.
│   │   │
│   │   ├── services/                ← CLIENT SERVICE MODULE
│   │   │   ├── authService.js       ← POST /auth/signup, /login, /logout, /reset
│   │   │   ├── gigService.js        ← GET/POST/PATCH/DELETE /gigs
│   │   │   ├── applicationService.js← POST + GET + PATCH /applications
│   │   │   ├── messageService.js    ← fetch() for history + native WebSocket
│   │   │   │                          connect / disconnect / onMessage
│   │   │   ├── profileService.js    ← GET/PATCH /profiles/student|business
│   │   │   └── analyticsService.js  ← GET /analytics/business
│   │   │
│   │   ├── state/
│   │   │   └── useAppState.js       ← state{} loading{} errors{} actions{}
│   │   │
│   │   └── components/
│   │       ├── shared/              ← Toast, Modal, Drawer, Badge, StatCard,
│   │       │                          SearchBar, AvatarInitials, PasswordStrength,
│   │       │                          SkillTag, EmptyState, LoadingShimmer
│   │       ├── auth/                ← SignIn, SignUp, ForgotPassword
│   │       ├── visitor/             ← Landing, PublicGigs
│   │       ├── student/             ← StudentDashboard, BrowseGigs,
│   │       │                          MyApplications, StudentMessages, StudentProfile
│   │       └── business/            ← BusinessDashboard, PostGig, ManageGigs,
│   │                                   Applications, Analytics, BusinessMessages
│   │
│   ├── index.html
│   ├── vite.config.js               ← VITE_API_URL, VITE_WS_URL env vars
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                          ← EXPRESS BACKEND
│   ├── src/
│   │   ├── index.js                 ← Creates HTTP server, attaches Express app
│   │   │                              and ws WebSocket server. Listens on PORT.
│   │   ├── app.js                   ← Express app factory: middleware stack + routers
│   │   │
│   │   ├── db/
│   │   │   └── pool.js              ← node-postgres Pool singleton
│   │   │                              Reads DATABASE_URL from environment
│   │   │                              max: 20, idleTimeoutMillis: 30000
│   │   │
│   │   ├── middleware/
│   │   │   ├── requireAuth.js       ← Verifies JWT → attaches req.user
│   │   │   │                          Returns 401 if missing/invalid/expired
│   │   │   └── validate.js          ← express-validator schema runner
│   │   │
│   │   ├── routes/                  ← URL → controller mapping
│   │   │   ├── auth.routes.js
│   │   │   ├── gigs.routes.js
│   │   │   ├── applications.routes.js
│   │   │   ├── messages.routes.js
│   │   │   ├── profiles.routes.js
│   │   │   └── analytics.routes.js
│   │   │
│   │   ├── controllers/             ← Business logic (no SQL, no req/res in repos)
│   │   │   ├── auth.controller.js   ← hash, signToken, verifyToken
│   │   │   ├── gigs.controller.js   ← ownership check before update/delete
│   │   │   ├── applications.controller.js ← duplicate guard, state machine
│   │   │   ├── messages.controller.js     ← persist + broadcastToRoom()
│   │   │   ├── profiles.controller.js
│   │   │   └── analytics.controller.js
│   │   │
│   │   ├── repositories/            ← Parameterised SQL only (no HTTP logic)
│   │   │   ├── user.repo.js         ← findByEmail, findById, create
│   │   │   ├── gig.repo.js          ← findAll(filters), findById, create, update, close
│   │   │   ├── application.repo.js  ← create, findByStudent, findByGig, updateStatus
│   │   │   ├── message.repo.js      ← findConversations, findMessages, insert
│   │   │   ├── profile.repo.js      ← findStudent, findBusiness, update
│   │   │   └── analytics.repo.js    ← findSnapshots, insertSnapshot
│   │   │
│   │   └── sockets/
│   │       └── messageSocket.js     ← WS upgrade handler
│   │                                   verify JWT → join room Map<convId,Set<ws>>
│   │                                   broadcastToRoom(convId, payload)
│   │
│   ├── sql/
│   │   ├── schema.sql               ← Full DDL: CREATE TABLE, indexes, constraints
│   │   └── seed.sql                 ← Mock data for local development
│   │
│   ├── .env.example                 ← DATABASE_URL, JWT_SECRET, PORT, CLIENT_ORIGIN
│   └── package.json
│
├── .github/workflows/
│   ├── client.yml                   ← Vercel deploy on push to main
│   └── server.yml                   ← Render deploy on push to main
│
└── README.md
```

**Architectural enforcement:** ESLint import boundary rules prevent `components/` from importing `services/` directly. On the server, `routes/` files may not import `repositories/` directly — only through `controllers/`. This encodes the layer contract in tooling, not just documentation.

---

#### 4. Physical View — Deployment Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│   USER DEVICES                                                       │
│   Desktop / Mobile browser (Chrome, Safari, Firefox)                │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ HTTPS (TLS 1.3)
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│   VERCEL EDGE NETWORK (Frontend Tier)                                │
│                                                                      │
│   React SPA static bundle (~200KB gzip)                             │
│   Served from nearest CDN edge node (200+ PoPs globally)            │
│   JS/CSS assets: Cache-Control: max-age=31536000, immutable          │
│   index.html:   Cache-Control: no-cache                              │
│   Automatic HTTP → HTTPS redirect                                    │
│   SLA: 99.99% │ TTFB < 50ms globally                                │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ HTTPS REST (port 443)
                         │ WSS WebSocket (port 443)
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│   RENDER (Backend Tier) — managed Node.js                           │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  Express.js HTTP Server                                      │  │
│   │                                                              │  │
│   │  Middleware:   cors({ origin: CLIENT_ORIGIN })               │  │
│   │                express.json()                                │  │
│   │                helmet()   (security headers)                 │  │
│   │                morgan()   (request logging)                  │  │
│   │                requireAuth() on protected routes             │  │
│   │                                                              │  │
│   │  Routes:  /auth  /gigs  /applications                        │  │
│   │           /messages  /profiles  /analytics  /health          │  │
│   │                                                              │  │
│   │  ws WebSocket Server (attached to same HTTP server)          │  │
│   │  JWT-authenticated rooms per conversation                    │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│   Health check: GET /health → 200 OK (Render polls every 30s)       │
│   Auto-restart on crash │ Auto-deploy on git push to main           │
│   Auto-provisioned TLS certificate │ SLA: 99.5%                     │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ TCP — DATABASE_URL (SSL enforced)
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│   POSTGRESQL DATABASE (Data Tier) — Neon or Railway                 │
│                                                                      │
│   Tables: users │ gigs │ applications │ conversations                │
│           messages │ analytics_snapshots                             │
│                                                                      │
│   Connection: node-postgres Pool (max 20 connections per instance)  │
│   Indexes:   gig_id, student_id, business_id, status (B-tree)       │
│   Constraints: FK integrity, UNIQUE(student_id, gig_id),            │
│                CHECK application status state machine               │
│   Backups: automated daily (Neon branching / pg_dump to S3)         │
│   SLA: 99.9%                                                         │
└──────────────────────────────────────────────────────────────────────┘

ENVIRONMENT VARIABLES
  Client (Vercel):    VITE_API_URL, VITE_WS_URL
  Server (Render):    DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, PORT
```

---

#### 5. +1 Use Case Scenarios (Architecture Validation)

| Scenario | Logical View | Process View | Development View | Physical View |
|---|---|---|---|---|
| **Student applies to gig** | `BrowseGigs → useAppState.apply() → applicationService.create() → POST /applications → appController → appRepo → applications table` | Optimistic update → POST → requireAuth → ownership check → INSERT → 201 → state confirmed | `components/student/BrowseGigs.jsx` → `state/useAppState.js` → `services/applicationService.js` → `server/routes/applications.routes.js` → `controllers/applications.controller.js` → `repositories/application.repo.js` | Vercel → Render (HTTPS POST) → PostgreSQL |
| **Business posts a gig** | `PostGig → useAppState.postGig() → gigService.create() → POST /gigs → gigController → gigRepo → gigs table` | Validate form → POST → requireAuth → INSERT → 201 → update state | `components/business/PostGig.jsx` → `services/gigService.js` → `server/routes/gigs.routes.js` → `repositories/gig.repo.js` | Vercel → Render (HTTPS POST) → PostgreSQL |
| **Real-time messaging** | `StudentMessages → messageService.connect() → WSS handshake → messageSocket.js → broadcast → Business SPA` | WS Upgrade → verify JWT → join room → POST /messages/send → INSERT → broadcastToRoom() → Business receives event | `services/messageService.js` ↔ `server/sockets/messageSocket.js` | Vercel → Render (WSS) → PostgreSQL |
| **Business reviews analytics** | `Analytics → analyticsService.get() → GET /analytics/business → analyticsController → analyticsRepo → analytics_snapshots` | GET → requireAuth → SELECT snapshot → JSON → SVG charts | `components/business/Analytics.jsx` → `services/analyticsService.js` → `server/routes/analytics.routes.js` | Vercel → Render (HTTPS GET) → PostgreSQL |

---

## Section 5: Architectural Patterns

### Activity 5.1 — Pattern Matching

| System Type | Suggested Pattern | Reasoning |
|---|---|---|
| Web Application | MVC + Layered | MVC separates UI rendering, user interaction handling, and data representation. Layered adds horizontal tier separation (Presentation, Business Logic, Data Access) for maintainability at scale. Together they address both intra-application structure (MVC) and cross-tier organisation (Layered). |
| Banking System | Layered + Repository + CQRS | Strict separation of business rules from data access (Layered + Repository). CQRS separates read models (balance display) from write models (transaction execution) which have different consistency requirements. Repository abstracts storage for regulatory compliance and auditability. |
| Compiler | Pipe-and-Filter | Source code flows through independent transformation stages (lexer → parser → semantic analyser → code generator), each stateless relative to others. New optimisation passes can be inserted without modifying existing stages. |
| Data Processing System | Pipe-and-Filter + Batch Sequential | Large-volume data is transformed through ordered stages in batches, ensuring deterministic, reproducible output — the foundation of ETL pipelines. |
| Real-time Event System | Event-Driven + Publish-Subscribe | Decoupled event channels let producers emit events without knowing which consumers will react. Tolerates consumer failure without blocking producers and scales to high event throughput. |

---

### Activity 5.2 — Patterns Applied to FunaGig

#### Primary Pattern: Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (React 19 + Tailwind CSS)                       │
│  Renders UI; translates user gestures into action calls             │
│  Allowed: useAppState hook only │ Prohibited: direct fetch() calls  │
└────────────────────────────────┬────────────────────────────────────┘
                       calls ▼
┌────────────────────────────────▼────────────────────────────────────┐
│  STATE / APPLICATION LAYER (useAppState hook)                       │
│  Orchestrates async workflows; maintains client-side state          │
│  Allowed: service layer only │ Prohibited: JSX, direct fetch()      │
└────────────────────────────────┬────────────────────────────────────┘
                       calls ▼
┌────────────────────────────────▼────────────────────────────────────┐
│  CLIENT SERVICE LAYER (authService, gigService, etc.)               │
│  Abstracts all HTTP/WS communication behind stable interfaces       │
│  Allowed: lib/api.js only │ Prohibited: React hooks, JSX            │
└────────────────────────────────┬────────────────────────────────────┘
                HTTPS REST / WSS ▼  (network boundary)
┌────────────────────────────────▼────────────────────────────────────┐
│  EXPRESS API LAYER (routes + controllers + middleware)              │
│  Handles HTTP routing, JWT auth, validation, business logic         │
│  Allowed: repository layer only │ Prohibited: direct pg queries     │
└────────────────────────────────┬────────────────────────────────────┘
                       calls ▼
┌────────────────────────────────▼────────────────────────────────────┐
│  REPOSITORY LAYER (*.repo.js files)                                 │
│  Parameterised SQL queries; data mapping to JS objects              │
│  Allowed: db/pool.js only │ Prohibited: HTTP logic, JWT handling    │
└────────────────────────────────┬────────────────────────────────────┘
                TCP (pg pool) ▼
┌────────────────────────────────▼────────────────────────────────────┐
│  DATA LAYER (PostgreSQL)                                            │
│  users │ gigs │ applications │ conversations │ messages │ analytics  │
└─────────────────────────────────────────────────────────────────────┘
```

**Why Layered is correct for FunaGig:** The pattern's defining property is *layer isolation* — each layer hides its implementation behind a stable interface. If PostgreSQL is replaced with MySQL, only the repository files change. If Express is replaced with Fastify, only route and controller files change. If the frontend is rebuilt in Vue.js, the Express API needs no modification. Each layer can also be tested in isolation by mocking the layer below it — a critical property for a team running automated tests.

---

#### Secondary Pattern: MVC

MVC is applied in both tiers of FunaGig.

**Frontend MVC:**
```
VIEW                        CONTROLLER                   MODEL
React Components        useAppState hook             PostgreSQL tables
(JSX rendering)         (action functions,           (via Express API)
                         state management)
user events ──────────► service calls      ─────────►
            ◄─────────── state updates     ◄──────────
```

**Backend MVC (Express):**
```
VIEW                        CONTROLLER                   MODEL
JSON responses          Controller functions          Repository functions
(res.json())            (business logic,              (parameterised SQL,
                         ownership checks,             data mapping)
HTTP request ──────────► validation)       ─────────►
             ◄─────────── return data       ◄──────────
```

The backend's "View" is the JSON response body. Controllers contain all business logic (duplicate-application checking, status-machine transitions, ownership verification). Repositories contain all SQL — keeping persistence concerns completely isolated from HTTP handling.

---

#### Supporting Pattern: Client-Server

| Axis | Client (React SPA) | Server (Express API) |
|---|---|---|
| Initiates communication | Always initiates HTTP requests; initiates WebSocket upgrade | Responds to HTTP; pushes WebSocket events to subscribers |
| State held | UI state via useAppState; JWT stored in memory | No session state — stateless by design; PostgreSQL holds persistent state |
| Security trust | Client is untrusted — JWT verified server-side; inputs re-validated in Express | `requireAuth` + ownership checks in controllers enforce authorisation |
| Scalability | Stateless — CDN serves unlimited concurrent users | Stateless Express — multiple Render instances can run behind a load balancer |

---

#### Tertiary Pattern: Publish-Subscribe (Messaging Sub-System)

```
┌─────────────────┐  POST /messages/send   ┌──────────────────────────┐
│  Student SPA    │──────────────────────►│  Express HTTP Handler    │
│  (Publisher)    │                        │  INSERT into messages    │
└─────────────────┘                        └───────────┬──────────────┘
                                                       │ after INSERT
                                           ┌───────────▼──────────────┐
                                           │  messageSocket.js        │
                                           │  (Message Broker)        │
                                           │  Map<convId, Set<ws>>    │
                                           │  broadcastToRoom(id,msg) │
                                           └───────────┬──────────────┘
                                                       │ WebSocket push
                                           ┌───────────▼──────────────┐
                                           │  Business SPA            │
                                           │  (Subscriber)            │
                                           │  ws.onmessage →          │
                                           │  useAppState update      │
                                           └──────────────────────────┘
```

`messageSocket.js` acts as the message broker, maintaining an in-process `Map<conversationId, Set<WebSocket>>` room registry. When a message is persisted, the controller calls `broadcastToRoom(conversationId, payload)`, which iterates the subscriber set and pushes the payload via each open WebSocket. The student SPA does not need to know whether the business SPA is online — the broker handles delivery.

---

## Section 6: Application Architectures

### Activity 6.1 — System Type Identification

> ✅ **Selected: Transaction Processing System (TPS)** — with Publish-Subscribe Event Processing sub-system

**Primary Classification: Transaction Processing System**

FunaGig is fundamentally a Transaction Processing System. Every core user action is a discrete transaction:

- A student submitting an application atomically INSERTs a row into `applications`. The Express controller checks for existing applications (duplicate guard), and the database's `UNIQUE(student_id, gig_id)` constraint prevents race-condition duplicates. If any step fails, no partial record persists.
- A business accepting an applicant must atomically UPDATE the application status and potentially UPDATE the gig status. The Express controller wraps these operations in a PostgreSQL transaction (`BEGIN / COMMIT / ROLLBACK` via `node-postgres`) to ensure either both succeed or neither does.
- A business closing a gig must UPDATE the gig status and prevent further applications. The SQL includes `WHERE id = $1 AND business_id = $2` — the ownership column acts as an authorisation guard at the SQL level.

**Secondary Classification: Event-Driven (Pub/Sub sub-system)**

The messaging feature operates on a different model. The INSERT into `messages` is a standard transaction. The delivery of that message to the business browser is asynchronous and event-driven: `messageSocket.js` broadcasts the payload to all WebSocket subscribers in the conversation room without them having issued a request. This Pub/Sub sub-system operates alongside the transactional core without coupling the two concerns.

---

### Activity 6.2 — Real-World Analysis

| Field | Detail |
|---|---|
| Organisation | FunaGig — modelled on Upwork and Fiverr, adapted for the Ugandan university labour market |
| System Type | Hybrid: Transaction Processing System (primary) + Publish-Subscribe Event Processing (messaging) |
| Architecture Applied | Layered (5-tier) + MVC (frontend and backend) + Client-Server (deployment) + Pub/Sub (WebSocket messaging). Frontend: React 19 SPA on Vercel CDN. Backend: Express.js on Render. Database: PostgreSQL with indexes and constraints. |

**Challenge 1: Variable Internet Connectivity in Uganda**

Architectural response: (a) *Optimistic UI updates* — state is updated immediately on user action before the Express API responds; rolled back with a recovery toast on failure. (b) *Loading shimmer states* — skeleton screens during data fetch rather than spinners. (c) *Vercel CDN* — React bundle served from the nearest global edge node. (d) *Paginated API responses* — `GET /gigs?limit=20&offset=0` keeps initial load times low regardless of database size.

**Challenge 2: Mobile Money Payment Integration**

Architectural response: A dedicated `paymentService.js` on the frontend and `POST /payments/initiate` endpoint on Express. The controller abstracts the provider (Flutterwave or Pesapal) — swapping providers requires only a controller change, not a route or frontend change. Both providers offer Node.js SDKs that integrate directly into Express controllers.

**Challenge 3: Trust and Identity Verification**

Architectural response: (a) *Email verification* — on signup, the Express auth controller sends a signed verification link via Nodemailer; `GET /auth/verify/:token` sets `email_verified = true`. Protected routes check `req.user.emailVerified`. (b) *Rating and review system* — `POST /ratings` after gig completion builds verifiable reputation. (c) *Future: `.ac.ug` domain validation* — the signup controller will restrict Student-role accounts to Ugandan university email domains.

---

## Section 7: Group Project — System Architecture

### 7.1 — System Overview

| Field | Detail |
|---|---|
| System Name | FunaGig |
| Purpose | A web-based gig marketplace connecting university students in Uganda with businesses seeking short-term, freelance, and project-based workers. |
| Primary Users | Students (browse, apply, track, message), Businesses (post, review, hire, analytics), Visitors (browse public gigs) |
| Scope (MVP) | JWT Authentication, Gig Management, Application Pipeline, Real-time Messaging (WebSocket), Profile Management, Business Analytics |
| Out of Scope (MVP) | Payments, mobile app, AI gig matching, SMS notifications |
| Future Scope | Mobile Money Payments (Flutterwave/Pesapal), React Native app, university email validation, AI gig matching, Redis WebSocket scaling, Africa's Talking SMS |

---

### 7.2 — Architectural Design

**Chosen Pattern: Layered (Primary) + MVC (Frontend & Backend) + Pub/Sub (Messaging)**

FunaGig uses a five-layer architecture spanning two independently deployed codebases. The **client** (React 19 on Vercel) implements three layers: Presentation, Application (useAppState), and Client Service. The **server** (Express.js on Render) implements two further layers: the Express API Layer (routes, controllers, middleware) and the Repository Layer (parameterised SQL). PostgreSQL forms the Data Layer at the base.

MVC is applied in both tiers. Pub/Sub governs the real-time messaging sub-system via `messageSocket.js`.

---

### 7.3 — Diagrams

#### Context Diagram

```
                         ┌──────────────────┐
                         │     Student      │
                         └────────┬─────────┘
    Browse/Apply/Track/Message    │    Notifications / Status
                                  │
┌──────────────┐  Post/Manage  ┌──▼──────────────────────────────────┐
│   Business   ├──────────────►│                                     │
│              │  Hire/Reject  │           F U N A G I G             │
│              │◄──────────────│     Student-Business Gig            │
└──────────────┘               │       Marketplace System            │
                               │                                     │
┌──────────────┐  Browse only  │                                     │
│   Visitor    ├──────────────►│                                     │
└──────────────┘               └──────────────┬──────────────────────┘
                                              │
              ┌───────────────────────────────┤
              │               │               │
              ▼               ▼               ▼
  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
  │  Payment System  │  │  Analytics   │  │  Support Agent   │
  │  Flutterwave /   │  │  Engine      │  │  (manual review) │
  │  Pesapal (Ph. 2) │  │  (snapshots) │  │                  │
  └──────────────────┘  └──────────────┘  └──────────────────┘
```

#### High-Level Architecture Diagram (3-Tier)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CLIENT TIER (Vercel CDN)                           │
│                                                                     │
│   React 19 + Vite SPA                                               │
│   ┌───────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│   │ Visitor Views │  │  Student Views │  │  Business Views    │    │
│   └───────────────┘  └────────────────┘  └────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │  useAppState Hook (state • loading • errors • actions)   │      │
│   └──────────────────────────────────────────────────────────┘      │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │  Service Layer: auth | gig | application | message |     │      │
│   │                 profile | analytics  (fetch / WS)        │      │
│   └──────────────────────────────────────────────────────────┘      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS REST + WSS
┌────────────────────────────▼────────────────────────────────────────┐
│                  SERVICE TIER (Render — Express.js)                 │
│                                                                     │
│   ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│   │  Middleware    │  │   REST Routes    │  │  WebSocket (ws)  │   │
│   │  cors, helmet  │  │  /auth /gigs     │  │  JWT auth on     │   │
│   │  express.json  │  │  /applications   │  │  upgrade; rooms  │   │
│   │  requireAuth   │  │  /messages       │  │  per conversation│   │
│   └────────────────┘  │  /profiles       │  └──────────────────┘   │
│                       │  /analytics      │                         │
│                       └──────────────────┘                         │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  Controllers (business logic) → Repositories (SQL)           │  │
│   └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ TCP — node-postgres pool (SSL)
┌────────────────────────────▼────────────────────────────────────────┐
│                  DATA TIER (PostgreSQL — Neon / Railway)            │
│                                                                     │
│   users │ gigs │ applications │ conversations                       │
│   messages │ analytics_snapshots                                    │
│   Indexes │ FK Constraints │ UNIQUE constraints │ CHECK constraints │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 7.4 — Component Description

| Component | Layer | Responsibility | Technology |
|---|---|---|---|
| Landing & Auth Module | Presentation | Sign In, Sign Up (role selection), Forgot Password. POSTs to Express `/auth` routes. Stores returned JWT in memory. | React 19, Tailwind CSS |
| Student Dashboard | Presentation | Overview stats, navigation hub. Reads `state.applications`, `state.notifications`. | React 19, Tailwind CSS, lucide-react |
| BrowseGigs | Presentation | Filterable gig listing. Calls `actions.apply(gigId, coverLetter)`. | React 19, Tailwind CSS |
| Business Dashboard | Presentation | Metrics overview. Reads `state.businessMetrics`. | React 19, Tailwind CSS |
| PostGig | Presentation | Two-panel form with live preview. Calls `actions.postGig(data)`. | React 19, Tailwind CSS |
| Analytics | Presentation | SVG charts for application volume, acceptance rate, top skills. | React 19, inline SVG |
| Shared UI Library | Presentation | Toast, Modal, Drawer, Badge, StatCard, SearchBar, AvatarInitials, PasswordStrength, SkillTag, EmptyState, LoadingShimmer. Props-only. | React 19, Tailwind CSS |
| useAppState Hook | Application | Single source of truth. Exposes `state`, `loading`, `errors`, `actions`. Manages optimistic updates and rollback. | React hooks |
| authService | Client Service | `POST /auth/signup`, `/login`, `/logout`, `/reset-password`, `GET /auth/me`. Stores JWT for subsequent requests. | fetch(), lib/api.js |
| gigService | Client Service | `GET /gigs?category=&skills=`, `GET /gigs/:id`, `POST /gigs`, `PATCH /gigs/:id`, `DELETE /gigs/:id`. | fetch(), lib/api.js |
| applicationService | Client Service | `POST /applications`, `GET /applications/student/:id`, `GET /applications/gig/:id`, `PATCH /applications/:id/status`. | fetch(), lib/api.js |
| messageService | Client Service | `GET /messages/conversations`, `GET /messages/:convId`, `POST /messages/send`. WebSocket: `connect(convId, token)`, `disconnect()`, `onMessage(cb)`. | fetch(), native WebSocket API |
| profileService | Client Service | `GET/PATCH /profiles/student`, `GET/PATCH /profiles/business`. | fetch(), lib/api.js |
| analyticsService | Client Service | `GET /analytics/business` — reads pre-aggregated snapshot data. | fetch(), lib/api.js |
| Express App | API | Registers middleware stack (cors, helmet, express.json, morgan, requireAuth), mounts all routers, attaches `ws` WebSocket server to the same HTTP server instance. | Express.js 4.x, Node.js |
| requireAuth Middleware | API | Extracts JWT from `Authorization: Bearer` header. Calls `jsonwebtoken.verify()`. Attaches `{ id, role, email }` to `req.user`. Returns 401 on missing/invalid/expired token. | jsonwebtoken |
| Auth Controller | API | `signup`: validate input, check email uniqueness, hash password (bcryptjs cost 12), INSERT user, sign and return JWT. `login`: find user by email, compare hash, sign and return JWT. | bcryptjs, jsonwebtoken |
| Gig Controller | API | `getAll`: build WHERE clause from query params, call gigRepo. `update`/`delete`: verify `gig.business_id === req.user.id` before mutation. | Express.js |
| Application Controller | API | `create`: duplicate guard, check gig is open, call applicationRepo. `updateStatus`: enforce state machine (pending → accepted/rejected/withdrawn). | Express.js |
| Message Controller + Socket | API | HTTP: persist message → call `broadcastToRoom(convId, payload)`. WebSocket: on upgrade, verify JWT, add socket to room Map, handle disconnect cleanup. | ws library |
| Repository Layer | Data Access | Parameterised SQL via `node-postgres`. `findAll`, `findById`, `create`, `update`, `delete` per table. Never interpolates user input into SQL. | node-postgres (pg) |
| PostgreSQL Database | Data | Persistent storage. UNIQUE on `(student_id, gig_id)`. CHECK on application status transitions. B-tree indexes on all FK columns and status fields. FK constraints for referential integrity. | PostgreSQL 15 |

---

### 7.5 — Technology Stack

| Layer | Technology | Version | Justification | Trade-offs Accepted |
|---|---|---|---|---|
| Frontend Framework | React | 19 | Component model, hooks, large ecosystem, Vite compatibility. | Larger bundle than Svelte; steeper curve than Vue. |
| Build Tool | Vite | 5.x | Native ESM, sub-second HMR, optimised production bundles. | Less mature plugin ecosystem than Webpack for edge cases. |
| Styling | Tailwind CSS | 3.x | Utility-first, no runtime overhead, no component library dependency. | Verbose class strings in JSX. |
| Icons | lucide-react | 0.383.0 | Tree-shakeable, 1,400+ icons, consistent stroke system. | Requires npm bundling. |
| Client Routing | react-router-dom | v7 | Declarative nested routing, URL-based role routing, post-auth redirects. | Adds ~25KB to bundle. |
| HTTP Client | fetch() (native) | — | Zero dependency. Wrapped in `lib/api.js` to attach JWT header and normalise errors. | No automatic retry/timeout — implemented manually in the wrapper. |
| Backend Framework | Express.js | 4.x | Minimal, widely documented, large middleware ecosystem, full architectural control. | Unopinionated — architectural discipline enforced via folder structure + ESLint. |
| Auth | jsonwebtoken + bcryptjs | 9.x / 2.x | Stateless JWT auth; bcrypt password hashing. No external service dependency. Full team ownership. | JWT revocation requires a denylist (Redis) for pre-expiry logout — planned Phase 2. |
| Request Validation | express-validator | 7.x | Declarative middleware-based validation with clean error formatting. | Adds middleware verbosity for complex schemas. |
| Security Headers | helmet | 7.x | Secure HTTP headers (CSP, HSTS, X-Frame-Options) with one `app.use()` call. | Default CSP may need tuning for CDN-loaded assets. |
| WebSocket | ws | 8.x | Lightweight WS library; attaches to the same HTTP server instance as Express — no separate port. | No built-in room management — implemented manually in `messageSocket.js`. |
| Database Driver | node-postgres (pg) | 8.x | Direct PostgreSQL access, connection pooling, parameterised queries, transaction support. No ORM overhead. | All queries written in SQL manually — no query builder. |
| Database | PostgreSQL | 15 | ACID transactions, relational integrity, array types for skills, partial indexes, CHECK constraints. | Requires SQL knowledge for schema and query design. |
| Frontend Hosting | Vercel | N/A | Zero-config CDN, automatic HTTPS, Git-triggered deploys, preview URLs per PR. | Pure static hosting — no SSR needed for this SPA. |
| Backend Hosting | Render | N/A | Managed Node.js, auto-HTTPS, crash restart, health-check monitoring, Git-triggered deploys, generous free tier. | Free tier sleeps after 15 min inactivity — mitigated by scheduled health-check ping. |
| Database Hosting | Neon / Railway | N/A | Managed PostgreSQL, automated backups, branching (Neon), free tier suitable for MVP scale. | Neon serverless may add cold-start latency — mitigated by `pg` pool keep-alive. |

---

### 7.6 — Non-Functional Requirements

#### Security (Defence-in-Depth)

**Authentication:** On `POST /auth/login`, the controller retrieves the user record by email, compares the submitted password with the stored bcrypt hash using `bcryptjs.compare()`, and signs a JWT: `jsonwebtoken.sign({ id, role, email }, JWT_SECRET, { expiresIn: '1h' })`. The token is returned in the response body and stored in React's in-memory state (not in `localStorage`, to mitigate XSS token theft). For session persistence across page reloads, an `httpOnly`, `Secure`, `SameSite=Strict` cookie is available as an alternative storage strategy.

**Authorisation:** `requireAuth` middleware is applied to all non-public routes. Controllers then verify resource ownership explicitly:

```js
// gigs.controller.js — update ownership check
const gig = await gigRepo.findById(req.params.id);
if (!gig) return res.status(404).json({ error: 'Gig not found' });
if (gig.business_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
```

**SQL Injection Prevention:** Every database interaction uses parameterised queries:

```js
// application.repo.js — safe parameterised query
const result = await pool.query(
  'INSERT INTO applications (gig_id, student_id, cover_letter) VALUES ($1, $2, $3) RETURNING *',
  [gigId, studentId, coverLetter]
);
```

String interpolation into SQL is an ESLint error in the project configuration.

**Transport and CORS:** Render and Vercel enforce HTTPS. The Express CORS configuration restricts `Access-Control-Allow-Origin` to the Vercel frontend origin (`CLIENT_ORIGIN` env var), blocking cross-origin requests from other domains.

**Input Validation:** `express-validator` middleware validates all request body fields at the route level — required fields, length limits, email format, enum membership — returning structured 400 errors before any business logic runs.

---

#### Performance

**Bundle Delivery:** React SPA compiles to ~200KB gzip served from Vercel CDN with `Cache-Control: max-age=31536000, immutable` on hashed assets. `index.html` uses `Cache-Control: no-cache`. Returning users load entirely from browser cache.

**Express Connection Pool:** `db/pool.js` initialises a `pg` Pool with `max: 20, idleTimeoutMillis: 30000`. The pool is shared across all request handlers — no per-request connection overhead. Connections are released back to the pool after each query.

**Optimistic UI:** `useAppState` applies state mutations immediately on user action, before the Express API responds. On API success, the server record replaces the optimistic placeholder. On failure, the update is rolled back with an error toast.

**Analytics Pre-aggregation:** A `node-cron` scheduled task within the Express server runs weekly, computing metrics and INSERTing a row into `analytics_snapshots`. The dashboard query becomes `SELECT ... WHERE business_id = $1 ORDER BY week_start DESC LIMIT 12` — a fast indexed read rather than a GROUP BY over the full applications table.

---

#### Scalability

**Stateless Frontend:** The SPA is static files served from Vercel's CDN. Scales to unlimited concurrent users.

**Stateless Express Server:** JWTs eliminate server-side session storage. Multiple Render instances can run behind a load balancer without sticky-session requirements. `pg` pool size per instance should be tuned to `total_db_connections / num_instances`.

**WebSocket Scaling Caveat:** The in-process room `Map` in `messageSocket.js` is not shared between Express instances. For multi-instance deployments, the broker must be externalised to Redis Pub/Sub (`ioredis`) so messages sent to one instance are broadcast to subscribers on all instances. This is a planned Phase 2 change.

**Database Partitioning:** `gigs` and `applications` support `RANGE` partitioning by `created_at` for deployments exceeding 100,000 records, maintaining query performance without schema-level query changes.

---

#### Reliability and Error Recovery

**Health Check:** `GET /health → 200 OK` is polled by Render every 30 seconds. Automatic process restart on failure.

**Transaction Safety:** Multi-step writes use explicit PostgreSQL transactions via `node-postgres`:

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE applications SET status=$1 WHERE id=$2', ['accepted', appId]);
  await client.query('UPDATE gigs SET status=$1 WHERE id=$2', ['filled', gigId]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

**React Error Boundaries:** Route-level error boundaries catch rendering exceptions and display a recovery UI, preventing a single component failure from crashing the full application.

---

## Section 8: Reflection & Bonus Task

### Individual Reflection

**1. Most challenging concept:**

The most challenging concept was understanding the role of the Repository Layer within Express and why it is architecturally necessary rather than stylistic. Early in the design process, the temptation was to write SQL directly in route handlers — `pool.query('SELECT * FROM gigs WHERE ...')` inline with `res.json()`. This works initially, but creates two problems: route handlers become difficult to test without a live database, and SQL logic becomes scattered across files. The Repository Layer solves both: route handler tests can mock the entire repository module (`jest.mock('../repositories/gig.repo')`), and all SQL for a given table is located in one file. The framing that unlocked this was thinking of each repository file as the *single source of truth for how a table is queried* — the database's public API as seen by the Express application, rather than boilerplate.

**2. Architectural decision the group struggled with most:**

The hardest decision was where to enforce authorisation: in middleware, in controllers, or in SQL. We adopted a layered authorisation strategy. `requireAuth` middleware handles *authentication* — confirming the request carries a valid JWT. Controllers handle *resource ownership* — confirming the authenticated user is allowed to act on the specific resource (`gig.business_id === req.user.id`). SQL queries include the ownership column in the WHERE clause as a final guard (`WHERE id = $1 AND business_id = $2`). This redundancy means a bug in one layer does not expose data. Deciding this required clearly distinguishing authentication (who are you?) from authorisation (what are you allowed to do?), and accepting that both require enforcement at multiple points in a production system.

**3. How we would improve the design with more time:**

Three improvements stand out. First, we would add end-to-end integration tests using Supertest (Express API) and Playwright (React frontend), with a dedicated test database seeded via `sql/seed.sql` before each run. This would catch API contract regressions before production. Second, we would implement JWT refresh tokens: the current 1-hour access token expiry is too short for good UX but a long-lived access token is a security risk. The standard solution — short-lived access token + long-lived httpOnly-cookie refresh token — requires a `POST /auth/refresh` endpoint in Express and token-refresh interceptor logic in `lib/api.js`. Third, we would externalise the WebSocket room map to Redis using `ioredis` Pub/Sub, enabling the Express server to scale to multiple Render instances without losing real-time message delivery across instance boundaries.

---

### Bonus Task — Architecture Pattern Comparison

#### Layered vs Client-Server

| Criteria | Layered Architecture | Client-Server Architecture |
|---|---|---|
| **Definition** | System divided into horizontal tiers (Presentation, Application, Service, API, Repository, Data). Each tier depends only on the tier directly below it. | System divided into clients (requesters) and servers (providers). No constraint on internal organisation of either party. |
| **Primary Concern** | Internal code organisation, separation of concerns, long-term maintainability. | Deployment topology and network communication model. |
| **Advantages** | Each layer can be changed, tested, or replaced in isolation. Enables parallel development. Prevents implementation details leaking across boundaries. | Simple mental model. Natural fit for distributed systems. Scales horizontally by adding server instances. |
| **Disadvantages** | Can feel over-engineered for simple systems. Every request passes through multiple layers. Risk of bloated layers if boundaries are not enforced by tooling. | Does not prescribe internal architecture — large systems often become disorganised monoliths. Business logic can leak inconsistently into both client and server. |
| **Best Use Case** | Multi-developer projects with planned refactoring, multiple integration points, and a long maintenance horizon. | Distributed systems where the primary concern is enabling multiple heterogeneous clients to access shared server resources. |
| **FunaGig Verdict** | **PRIMARY PATTERN** — governs all code organisation in both React and Express. | **SUPPORTING PATTERN** — accurately describes FunaGig's deployment model; provides no guidance on internal code structure. |

---

#### MVC vs Repository

| Criteria | MVC Pattern | Repository Pattern |
|---|---|---|
| **Definition** | Separates system into Model (data), View (UI), Controller (logic coordinating the two). | Mediates between business logic and data access using a collection-like interface hiding the underlying SQL. |
| **Primary Concern** | Separation of UI rendering from data and logic. | Separation of business logic from data access technology. |
| **Advantages** | Maps naturally to both React and Express. Well understood with extensive documentation. Enables View and Controller testing in isolation. | Completely decouples logic from SQL. Mock repositories enable comprehensive unit testing without a database. Supports database technology changes without touching controllers. |
| **Disadvantages** | Controller role loosely defined in React's unidirectional flow — `useAppState` holds both Controller and partial Model responsibilities. MVC does not prescribe a data access strategy. | Adds abstraction overhead; may feel like boilerplate for simple CRUD. Complex queries (deep JOINs, aggregations) can make the repository interface leaky. |
| **Best Use Case** | Applications with clear request-response patterns and UI components that need to be developed and tested independently of data fetching logic. | Applications requiring comprehensive unit testing, multiple data source support, or anticipated database technology changes. |
| **FunaGig Application** | **APPLIED** in both tiers. Frontend: React components (View), `useAppState` (Controller), PostgreSQL via Express (Model). Backend: JSON responses (View), controller functions (Controller), repository functions + PostgreSQL (Model). | **APPLIED** in the Express backend. Each `*.repo.js` exposes a collection-like interface (`findAll`, `findById`, `create`, `update`, `delete`) that hides all parameterised SQL from controllers. |

---

#### Emerging Pattern: Event-Driven Architecture (Future Consideration)

As FunaGig scales, adding synchronous side effects (email notification, SMS, analytics events, fraud detection) to the application submission controller would increase its latency and create a single point of failure. An Event-Driven Architecture would address this by having the database write emit a domain event (`ApplicationSubmitted`) to an event bus (AWS SQS, RabbitMQ, or Node.js `EventEmitter` at MVP scale). Each downstream service subscribes independently and processes events asynchronously. The primary write completes immediately; side effects are fully decoupled.

This is planned for FunaGig Phase 3. Notification logic is already isolated in a dedicated `notificationService.js` module rather than embedded in controllers — the architectural seam for the future event-driven replacement is in place from day one.

---

*End of Workbook — FunaGig Architectural Design Report | Week 5 (React + Express Revision)*
