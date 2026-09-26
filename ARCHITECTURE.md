# System Architecture & Technical Specification: SSISM IMS

This document details the architectural design, concurrency controls, security mechanisms, and developer extension guidelines for the **College Asset & Inventory Management System (SSISM IMS)**.

---

## 1. High-Level Architecture

The system employs a decoupled, tiered client-server architecture with an ORM-backed relational database:

```mermaid
graph TD
    User([Staff / Student / Admin]) <--> ReactApp[React.js 19 + Tailwind UI]
    ReactApp <--> Axios[Axios API Client + Cookie Interceptors]
    Axios <--> ExpressAPI[Express.js REST API :5001]
    
    subgraph ExpressAPI[Express.js Layer]
        Helmet[Helmet & CORS Guard] --> RateLimiter[Rate Limiters]
        RateLimiter --> AuthCookie[JWT HTTP-Only Cookie Auth]
        AuthCookie --> RBAC[5-Tier Role Guard]
        RBAC --> Controllers[Controllers & Zod Validators]
        Controllers --> Services[Business Services & Concurrency Locks]
    end
    
    Services <--> PrismaORM[Prisma ORM Client v6]
    PrismaORM <--> MySQL[(MySQL 8.0+ Database)]
```

---

## 2. Zero-Conflict Allocation Engine (Concurrency Control)

In a college environment with multiple inventory desks operating during semester distribution, race conditions frequently occur when two staff members attempt to allocate the same laptop simultaneously. 

### Concurrency Lock Implementation

The allocation engine enforces concurrency control using **MySQL Transaction Isolation** and **Atomic Conditional Check-and-Update**:

```javascript
// server/src/services/allocation.service.js
export const createAllocation = async ({ assetId, recipientId, dueDate, issueCondition, ... }) => {
  return await prisma.$transaction(async (tx) => {
    // 1. One Active Laptop Rule: Verify recipient holds no active laptop
    const existingActive = await tx.allocation.findFirst({
      where: { recipientId, status: 'ACTIVE' }
    });
    if (existingActive) {
      throw new AppError('Allocation Conflict: Recipient already holds an active laptop.', 409);
    }

    // 2. Concurrency Lock: Atomic check-and-update on Asset status
    // If another transaction claimed this asset moments earlier, count will be 0
    const updateResult = await tx.asset.updateMany({
      where: { id: assetId, status: 'AVAILABLE' },
      data: { status: 'ISSUED', condition: issueCondition }
    });

    if (updateResult.count === 0) {
      throw new AppError('Allocation Conflict Lock: Asset is no longer available.', 409);
    }

    // 3. Create Allocation Ledger Record
    const allocation = await tx.allocation.create({ ... });

    // 4. Record Immutable Audit Trail
    await logAudit({ action: 'ALLOCATION_ISSUED', entityId: allocation.id, tx });

    return allocation;
  });
};
```

---

## 3. Five-Tier Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | `SUPER_ADMIN` | `STAFF` | `HIGHER_MANAGEMENT` | `FACULTY` | `STUDENT` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Dashboard & Metrics** | Full | Full | Full | Read | Read |
| **Laptop Inventory List** | Full | Full | Full | Read | Read |
| **Register / Update Laptop** | Full | Full | Read-Only | Read-Only | Read-Only |
| **Delete Laptop Asset** | Full | Blocked | Blocked | Blocked | Blocked |
| **Issue / Allocate Laptop** | Full | Full | Blocked | Blocked | Blocked |
| **Accept Return & Inspection**| Full | Full | Blocked | Blocked | Blocked |
| **Log Hardware Maintenance** | Full | Full | Blocked | Blocked | Blocked |
| **Update License Fee Status** | Full | Full | Blocked | Blocked | Blocked |
| **System Governance Audit Trail**| Full | Blocked | Read-Only | Blocked | Blocked |
| **Bulk CSV Import / Export** | Full | Full | Export Only | Blocked | Blocked |

---

## 4. Phase 2 Extensibility Guide (Native MySQL JSON)

### Purpose & Problem Statement
Phase 1 focuses strictly on **400+ Laptops**. In Phase 2, the campus plans to manage:
- Networking Routers & Access Points (WAN IPs, SSID configs, VLAN IDs)
- CCTV Cameras (RTSP streams, lens focal lengths, resolution)
- Smart TVs & Interactive Touch Whiteboards (Screen diagonal, OS, firmware)
- Lab Peripherals (Keyboards, mice, desktop CPUs, monitors)

Altering traditional relational tables for every new hardware category requires constant database migrations, schema churn, and nullable columns.

### Critical Architecture Solution
We equipped the `Asset` table in `server/prisma/schema.prisma` with a **MySQL Native `JSON` column**:

```prisma
model Asset {
  id             Int            @id @default(autoincrement())
  assetTag       String         @unique
  serialNumber   String         @unique
  category       AssetCategory  @default(LAPTOP)
  make           String
  model          String
  // ... Core relational columns (processor, ram, storage, condition, status)

  // CRITICAL DESIGN FOR PHASE 2: Native MySQL JSON for Dynamic Category Attributes
  attributes     Json?
}

enum AssetCategory {
  LAPTOP
  ROUTER
  CCTV
  SMART_TV
  INTERACTIVE_WHITEBOARD
  PERIPHERAL
  OTHER
}
```

### How to Add Phase 2 Categories (No Migrations Required)

#### 1. Adding a Networking Router
```json
{
  "assetTag": "CLG-RTR-001",
  "serialNumber": "SN-CISCO-883912",
  "category": "ROUTER",
  "make": "Cisco",
  "model": "Catalyst 9200",
  "attributes": {
    "macAddress": "70:81:05:44:A1:B2",
    "ipAddress": "192.168.10.1",
    "portCount": 24,
    "poeSupported": true,
    "firmwareVersion": "v17.9.4a",
    "vlanIds": [10, 20, 30, 40]
  }
}
```

#### 2. Adding a CCTV Camera
```json
{
  "assetTag": "CLG-CAM-015",
  "serialNumber": "SN-HIK-49102",
  "category": "CCTV",
  "make": "Hikvision",
  "model": "DS-2CD2043G2-I",
  "attributes": {
    "resolution": "4K (3840x2160)",
    "lensFocalLength": "2.8mm Fixed",
    "nightVisionRange": "30 meters",
    "rtspStreamUrl": "rtsp://admin:ssism@192.168.20.15:554/ch1/main",
    "locationPole": "Gate 1 Main Entrance"
  }
}
```

#### 3. Adding an Interactive Smart Whiteboard
```json
{
  "assetTag": "CLG-SBRD-004",
  "serialNumber": "SN-VIEW-77189",
  "category": "INTERACTIVE_WHITEBOARD",
  "make": "ViewSonic",
  "model": "ViewBoard IFP7550-5",
  "attributes": {
    "screenSize": "75 inches 4K",
    "touchPoints": 40,
    "androidVersion": "Android 11",
    "stylusCount": 2,
    "classroomLocation": "Seminar Hall B"
  }
}
```

Because MySQL 8.0 natively optimizes and indexes JSON binary documents (`JSON_EXTRACT`, virtual generated columns, and multi-valued indexes), querying Phase 2 dynamic attributes can be achieved with zero performance penalties.

---

## 5. Security & Hardening Measures

1. **Password Hashing**: Bcrypt with Salt Round = 12.
2. **HTTP-Only Cookies**: JWT tokens are issued with `httpOnly: true`, preventing XSS JavaScript access.
3. **CORS Configuration**: Restricts access to trusted campus frontend origins with `credentials: true`.
4. **Rate Limiting**: Multi-tiered rate limiters (`express-rate-limit`) on authentication attempts (50 attempts per 15 min) and API requests.
5. **Input Validation**: All payloads validated strictly against Zod schemas before reaching the database.
6. **SQL Injection Prevention**: Prisma ORM uses parameterized SQL queries exclusively.

---

## 6. UI Layer Stacking Hierarchy & Z-Index Architecture

To eliminate dropdown clipping and overlapping visual bugs across viewports, the application enforces a strict global stacking order:

| UI Layer | Tailwind Z-Index | Component Examples |
| :--- | :--- | :--- |
| **Base Content & Cards** | `z-0` | Stat cards, table data rows, timeline ledgers |
| **Filter & Control Bars** | `relative z-20` | Inventory filter bar, multi-select search filters |
| **Sticky Navigation Bar** | `sticky top-0 z-40` | Main application header (`h-16`) |
| **Search Autocomplete & Actions** | `absolute / fixed z-50` | `GlobalSearch` dropdown, floating multi-select action bar |
| **Modal Backdrops & Dialogs** | `fixed inset-0 z-[60]` | `Modal.jsx`, `AllocateModal`, `ReceiptModal`, `AddMaintenanceModal` |

---

## 7. Donor & Master Settings Entity Architecture

```mermaid
erDiagram
    Donor ||--o{ Asset : "donates"
    Department ||--o{ Asset : "owns"
    Category ||--o{ Asset : "classifies"
    Asset ||--o{ Allocation : "assigned_in"
    Asset ||--o{ MaintenanceLog : "serviced_in"
    
    Donor {
        int id PK
        string name
        string organization
        string email
        string phone
        datetime donationDate
    }
    
    Category {
        int id PK
        string name
        string code UK
        string description
    }
    
    Asset {
        int id PK
        string assetTag UK
        string serialNumber UK
        enum acquisitionSource
        int donorId FK
        string displaySize
        string color
        string generation
        json attributes
    }
```

