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

## 🛠️ Project Structure & Directory Layout

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

## 📦 System Modules Explained

The backend codebase is modular, separated by domains. Each module contains its own routes, controller, service, validation, and mongoose models:

### 1. `auth` (Authentication & Users)
- **Purpose**: Manages secure access control, registration, and user profiles.
- **Features**: User registration, JWT-based login (with access and refresh token rotation), password hashing via `bcrypt`, and password recovery.
- **Roles**: Restricts access via role-based middleware (`SUPER_ADMIN`, `ADMIN`, `SELLER`).

### 2. `campaign` (Fundraising Campaigns)
- **Purpose**: Oversees the lifecycle of a sales/fundraising campaign.
- **Features**: Campaign creation, expiration configuration, target goal definitions, and tracking of progress towards campaign-specific targets. Calculates sales stats (SEK generated, package totals) for the campaign.

### 3. `campaignProduct` (Campaign-Product Assignments)
- **Purpose**: Maps products from the general catalog to specific active campaigns.
- **Features**: Allows custom package selection for each campaign.

### 4. `group` (Sellers & Teams Groups)
- **Purpose**: Handles user group hierarchies.
- **Features**: Groups organize sellers under campaigns. Calculates progress towards next tier profit brackets and assigns invite codes.

### 5. `order` (Sales & Order Tracking)
- **Purpose**: Manages purchases, checkout, and shipment tracking.
- **Features**: Generates customer order states (`pending`, `confirmed`, `shipped`, `delivered`, `cancelled`). Records quantity packages sold and total prices in SEK.

### 6. `product` (Base Product Catalog)
- **Purpose**: Stores the universal product inventory.
- **Features**: CRUD controls for product details, pricing, images, and descriptions.

### 7. `tier` (Commission Rules)
- **Purpose**: Handles volume-based profit rules.
- **Features**: Defines thresholds (e.g., selling 1-100 packages unlocks 10% commission, 101-200 packages unlocks 15% commission, etc.).

### 8. `dashboard` (Analytics & Metrics)
- **Purpose**: The dynamic aggregation engine for charts and KPIs.
- **Features**: Compiles custom panels based on the caller's role (Super Admin views total revenue/fees; Admin views group sales; Seller views individual performance).

### 9. `activityLog` (Social Feed & Logs)
- **Purpose**: Provides audit trails and timeline events.
- **Features**: Automatically logs critical status shifts (e.g., "Campaign Started", "New Order Placed") to display as updates.

### 10. `contact` (Support Queries)
- **Purpose**: Processes customer feedback/support requests.
- **Features**: Saves support forms and forwards details to administrators.

### 11. `faq` (F.A.Q. Management)
- **Purpose**: Standard informational module.
- **Features**: CRUD controls for frequently asked questions on the storefront/dashboard.

### 12. `invitation` (Group Onboarding)
- **Purpose**: Manages invitation links for new members.
- **Features**: Allows admins to generate single-use/group invite tokens for registering sellers.

### 13. `public` (Storefront Access)
- **Purpose**: Exposes non-authenticated routes.
- **Features**: Enables buyers to view a group's campaign shop and purchase products securely.

---

## 🔑 Core Features & Workflow

### 🔒 Secure Role-Based Authorization
A layered middleware architecture verifies the caller's JWT access tokens and checks if their role matches the route parameters:
- `SUPER_ADMIN`: Has read/write access to system parameters, global groups, products, and financials.
- `ADMIN`: Assigned to a specific group/campaign. Can monitor group members, update campaign details, and review group order lists.
- `SELLER`: Can access personal sales logs, generate customer shop links, and view group tier stats.

### 📈 Volume-Based Tier Commission Logic
As sellers submit orders, the system updates the group's `totalPackagesSold`. The platform fetches configured `Tiers` to dynamically compute:
- **Current Profit Margin**: The percentage of sales group members receive.
- **Next Tier Goal**: The package count remaining to reach the next profit percentage bracket.

### ⚡ Real-Time Socket.io Updates
WS connection gateways notify listening clients of changes without requiring manual refreshes:
- Real-time updates for order placements.
- Instantly notifies admins when a seller registers or joins.

### 📬 Background Job Processing
- **BullMQ Integration**: Processes intensive operations (like dispatching verification links and invoice emails) using a separate redis-backed thread pool.
- **Node-cron Integration**: Automated checks executed nightly to terminate expired campaigns.

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
