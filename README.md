# SSISM IMS: College Asset & Inventory Management System

A scalable, secure, and modular full-stack web application designed for **Shri Shivaji Institute of Science & Management (SSISM)** to replace spreadsheet-based asset tracking. Built to manage 400+ campus laptops, lifecycle allocations, hardware upgrades, and software license fee clearance with zero-conflict concurrency control.

---

## 🌟 Tech Stack

- **Frontend**: React 19 (Vite), Tailwind CSS, Axios, Lucide React, React Router DOM v7.
- **Backend**: Node.js, Express.js (Modular ES Modules Architecture).
- **Database**: MySQL 8.0+ managed via **Prisma ORM** (Type safety, migrations, and SQL injection prevention).
- **Authentication**: JWT with HTTP-Only Cookies & Refresh Token rotation.
- **Security**: 5-Tier RBAC, Bcrypt (salt=12), Zod validation, Helmet security headers, rate limiting.
- **Reporting & Data Engine**: Multer, CSV-Parser, ExcelJS, PDFKit (Printable institutional receipts).

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** (v18+)
- **MySQL** (v8.0+ running on `localhost:3306`)

### 2. Database Setup & Seeding
The backend `.env` is configured with:
```env
DATABASE_URL="mysql://root:Yogi@0166@localhost:3306/ssism_ims"
PORT=5001
JWT_ACCESS_SECRET="ssism_super_secret_access_jwt_key_2026_@production"
JWT_REFRESH_SECRET="ssism_super_secret_refresh_jwt_key_2026_@production"
```

To regenerate the database client and populate rich seed data:
```bash
cd server
npm run prisma:push    # Synchronizes Prisma schema with MySQL
npm run seed           # Populates 9 departments, 25 laptops, 17 users, allocations & fees
```

### 3. Running Backend Server
```bash
cd server
npm start              # Runs on http://localhost:5001/api
```

### 4. Running Frontend Client
```bash
cd client
npm run dev            # Runs on http://localhost:5173
```

---

## 🔑 Demo User Credentials

The application provides convenient **One-Click Role Switcher** buttons on the login screen, or you can log in manually:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@ssism.edu` | `Admin@123` | Full CRUD, User Management, Audit Logs, Settings |
| **Inventory Staff** | `staff@ssism.edu` | `Staff@123` | Issue/Return Laptops, Maintenance, Bulk Import/Export |
| **Accounts / Fee Staff** | `accountant@ssism.edu` | `Staff@123` | License Fee Tracking, Mark Paid, Fee Overrides |
| **Auditor / Dean** | `auditor@ssism.edu` | `Dean@123` | Read-only Dashboards, Audit Trails, Governance |
| **Student** | `st.aarav@ssism.edu` | `Student@123` | Self-view assigned laptop profile and fee status |

---

## 🛡️ Core Functional Highlights

### 1. Zero-Conflict Allocation Engine
- **Database-Level Transaction Locks**: Uses Prisma `$transaction` with atomic check-and-update (`UPDATE Asset SET status = 'ISSUED' WHERE id = ? AND status = 'AVAILABLE'`) to eliminate race conditions when multiple staff members allocate simultaneously.
- **One Active Laptop Rule**: Strictly prevents students or faculty from holding multiple active laptops.
- **Software License Fee Alert**: Detects students with `UNPAID` software license fees and requires an explicit Dean/HOD authorization override before a laptop can be issued.

### 2. Comprehensive Lifecycle & Timeline Ledgers
- **Immutable Assignment History**: Even when a laptop is currently returned and in `AVAILABLE` stock, its profile displays a complete chronological timeline of every student/faculty member who held it, issue dates, return dates, and handover physical condition.
- **Hardware Upgrade Registry**: Tracks RAM upgrades (e.g. 8GB → 16GB/32GB), SSD expansions, battery replacements, and screen repairs with costs, technician notes, and part serials.

### 4. Donor & Purchase Management Module (`/donors`)
- **Acquisition Source Tracking**: Categorizes equipment as College Purchased or Donated (CSR Foundation, Alumni batches, Philanthropic trusts).
- **KPI Metrics & Ratio Analysis**: Real-time cards displaying Donated vs. Purchased counts, registered donors count, total fleet strength, and visual acquisition percentage progress bars.
- **Donor Directory & Inspection**: Filterable directory with "+ Register Donor" modal and a "Donated Laptops" inspection modal revealing the live custody status of contributed units.

### 5. Dynamic Master Settings (`/settings`)
- **Campus Departments**: Super Admin interface to add, update, and manage academic departments with live student and asset counters.
- **Phase 2 Equipment Categories**: Scalable category master supporting zero-migration expansion for future routers, CCTV cameras, and smart displays.
- **5-Tier Role RBAC Matrix**: Transparent visual reference of permission tiers across Super Admin, Higher Management, Staff, Faculty, and Student roles.

### 6. Institutional Import / Export & PDF Receipts
- **Bulk CSV / Excel Import**: Template download and duplicate detection for migrating 400+ laptops from legacy Google Sheets.
- **Official PDF Receipt Generator**: Dynamic PDF receipts complete with college header, recipient details, laptop hardware specs, accessories checklist (Charger, Bag, Mouse), policy undertaking, and dual signature blocks.

---

## 📂 Project Structure

```
/SSISM_IMS
├── /server
│   ├── package.json
│   ├── .env
│   ├── /prisma
│   │   ├── schema.prisma         (MySQL Database Models)
│   │   └── seed.js               (Realistic seed records)
│   └── /src
│       ├── server.js             (Server entrypoint)
│       ├── app.js                (Express middleware wiring)
│       ├── /config               (Database & Environment variables)
│       ├── /controllers          (HTTP request handlers)
│       ├── /middlewares          (Auth, RBAC, Validation, Rate Limiters)
│       ├── /routes               (RESTful route definitions)
│       ├── /services             (Prisma transactions & business logic)
│       └── /utils                (Zod schemas, AppError, PDF generation)
│
├── /client
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── /src
│       ├── main.jsx
│       ├── App.jsx               (Router & Protected layout)
│       ├── /components           (Reusable UI, Modals, Badges, Search)
│       ├── /context              (AuthContext & Token refresh)
│       ├── /pages                (Dashboard, Inventory, Allocations, Fees, etc.)
│       └── /services             (Axios API client)
│
├── README.md
└── ARCHITECTURE.md               (System design & Phase 2 extension guide)
```
# SSISM-IMS
