# ProteinW Backend API

ProteinW Backend is a robust, scaleable, and highly secure REST API powering the ProteinW dashboard platform. It handles role-based authorization, dynamic fundraising campaign management, real-time socket communication, background worker queues, sales metrics calculations, and group progress updates.

## 🚀 Technologies

- **Runtime Environment**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Real-Time Communication**: Socket.io
- **Job Queues & Workers**: BullMQ (Redis-backed)
- **Task Scheduling**: Node-cron
- **Email Dispatching**: Nodemailer
- **Request Validation**: Zod
- **Security**: JWT & bcrypt

---

## 🛠️ Project Structure

```text
src/
├── app/
│   ├── config/        # Environment configurations & database setup
│   ├── middlewares/   # Auth authorization, global error handler, validation
│   ├── modules/       # Domain modules (auth, group, campaign, order, etc.)
│   ├── routes/        # Main route aggregator
│   └── socket/        # WebSocket gateways & events
├── errors/            # Custom API error handlers
├── utils/             # Helper classes & handlers (e.g. catchAsync, sendResponse)
├── server.ts          # Express Server startup & Mongoose connection entry point
└── worker.ts          # BullMQ queue workers background execution entry point
```

---

## 🔑 Key Features

### 1. Role-Based Access Control (RBAC)
Supports hierarchical roles: `SUPER_ADMIN`, `ADMIN`, and `SELLER` with customized dashboard metrics:
- **Super Admin**: Views global stats, revenues, and configuration.
- **Admin**: Views and manages their specific campaign and assigned seller groups.
- **Seller**: Tracks individual progress, assigned group goals, and live shop performance.

### 2. Campaign & Sales Engine
- Live tracking of target goals in SEK.
- Calculates and dynamically updates tiers/profit margins based on sales volume.
- Real-time aggregation of orders and package statuses.

### 3. Background Workers & Queues
- Uses **BullMQ** to process asynchronous jobs (like emails or media processing) in a dedicated background worker process without blocking the main event loop.
- **Node-cron** schedules cron jobs for periodic database maintenance and state checks.

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Database Instance
- Redis server instance (for BullMQ queues)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/apponislam/proteinw-backend.git
cd proteinw-backend
npm install
```

### 2. Environment Variables Configuration
Create a `.env` file in the root directory and configure the variables based on `.env.example`:
```ini
# Environment
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URL=mongodb+srv://...

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret Keys
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# Nodemailer Setup
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the API server in development mode using `ts-node-dev`. |
| `npm run build` | Transpiles the TypeScript codebase into clean JavaScript inside `/dist`. |
| `npm run start` | Runs the compiled production-ready server from `/dist/server.js`. |
| `npm run worker:dev` | Runs the background worker queue process in development mode. |
| `npm run worker` | Runs the compiled worker queue in production mode. |
| `npm run lint` | Inspects code for potential linting issues. |

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
