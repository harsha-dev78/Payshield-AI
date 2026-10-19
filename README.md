# 🛡️ PayShield AI — Pre-Capture Payment Security Agent

> **An evidence-based payment security firewall and explainable AI risk interceptor for online merchants.**  
> Built for the **PayPal AI Hackathon 2026** • Zero-Cost Cloud Architecture • Fully Reproducible $0 Local Run.

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Main Features](#-main-features)
- [How the AI Risk Engine Works](#-how-the-ai-risk-engine-works)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [Configuring PayPal Sandbox](#-configuring-paypal-sandbox)
- [Testing & Quality Checks](#-testing--quality-checks)
- [Project Structure](#-project-structure)
- [Security & Privacy Practices](#-security--privacy-practices)
- [Deployment (Render Blueprint)](#-deployment-render-blueprint)
- [License](#-license)

---

## 🔍 Overview

E-commerce merchants lose billions annually to payment fraud, card-testing attacks, and dispute fees. Traditional fraud solutions operate as opaque "black boxes" that calculate mysterious scores post-transaction—leaving merchants either blindly absorbing chargeback penalties or alienating legitimate buyers through unexplained declines.

**PayShield AI** changes this paradigm by acting as an **intelligent, explainable pre-capture firewall**:
1. **Pre-Capture Interception:** Telemetry and transaction metadata are evaluated *before* funds are authorized or captured through the payment gateway.
2. **Fact vs. Inference Attribution:** Every risk assessment explicitly distinguishes between *observed telemetry facts* (e.g. *"IP country resolves to NL, whereas shipping destination is US"*) and *heuristic inferences*.
3. **Actionable Counterfactuals:** Instead of rejecting transactions outright, PayShield AI answers *"What Would Change This Decision?"*, presenting merchants and buyers with concrete conditions (e.g. 3D-Secure challenge or residential IP verification) to safely unlock the order.
4. **Zero-Dependency Demo Mode:** Includes a fully functional offline mock gateway fallback, allowing instant evaluation without requiring external API keys.

---

## ✨ Main Features

| Feature | Description |
| :--- | :--- |
| **🛡️ Pre-Capture Interceptor** | Evaluates transactions in real time prior to PayPal capture. High-risk orders are blocked pre-authorization to prevent chargebacks and payment processor fees. |
| **🧠 Dual-Model Risk Engine** | Combines a transparent deterministic heuristic engine with an in-process calibrated Logistic Regression / Decision-Tree ensemble classifier. |
| **🔎 Evidence-to-Action Forensics** | Unbundles risk scores into weighted factors across 5 categories: Geography, Network, Velocity, Behavioral, and Financial. |
| **🔄 Counterfactual Reasoning** | Generates dynamic recommendations answering *"What Would Change This Decision?"* with specific point reductions for buyer verification. |
| **📊 AG Grid Transaction Feed** | High-performance triage table built on AG Grid Community with real-time risk badges, multi-column filtering, sorting, and drill-down inspection. |
| **💳 Live PayPal Sandbox Gateway** | Native integration with the official PayPal Orders v2 REST API supporting OAuth2 token caching, order creation, and capture. |
| **📜 Tamper-Evident Audit Ledger** | Immutable SQLite audit trail logging every assessment, policy version, merchant override, and PayPal capture ID. |
| **🏪 Interactive Sandbox Storefront** | Built-in test checkout interface with 5 pre-configured risk archetypes to test benign and adversarial payment scenarios. |
| **📐 APIMatic Contract Validator** | In-app inspection suite verifying PayPal v2 Order payloads against canonical APIMatic schemas. |

---

## 🧠 How the AI Risk Engine Works

PayShield AI employs a **dual-model evaluation pipeline** running entirely in-process for sub-millisecond decision latency and zero cloud dependency:

```text
Incoming Transaction Payload
       │
       ├──► 1. Telemetry Ingestion (IP, VPN flag, Device Fingerprint, Account Age, Velocity, Address Matching)
       │
       ├──► 2. Deterministic Heuristic Engine (5 Signal Categories)
       │       ├── GEOGRAPHY: Cross-border mismatch, billing vs shipping discrepancy
       │       ├── NETWORK: Datacenter IP, commercial VPN, Tor exit node detection
       │       ├── VELOCITY: Rapid failed checkout attempts (card-testing pattern)
       │       ├── BEHAVIORAL: Disposable/ephemeral email inbox (@tempmail, @mailinator)
       │       └── FINANCIAL: High-basket value on young/unverified accounts
       │       └── Positive Signals: Established account tenure, domestic cohesion
       │
       ├──► 3. Calibrated ML Classifier (Logistic Regression Ensemble)
       │       ├── Feature extraction & weighted logit combination
       │       ├── Sigmoid activation: Fraud Probability (0.00 – 1.00)
       │       └── Grounded natural language narrative generation
       │
       ├──► 4. Counterfactual Generator ("What Would Change This Decision?")
       │       └── Calculates mathematical score reduction for remediation paths
       │
       └──► 5. Policy Decision Tiering
               ├── Score < 30   ──► ALLOW  (Automated PayPal capture approved)
               ├── Score 30-65  ──► REVIEW (Manual merchant verification recommended)
               └── Score > 65   ──► BLOCK  (Pre-capture hold; settlement arrested)
```

### Risk Score Calculation
- **Baseline Score:** Starts at 15 points (standard baseline risk for card-not-present e-commerce).
- **Adversarial Signals:** Add weighted points based on severity (e.g. +35 for velocity spikes, +28 for country mismatch, +22 for proxy/VPN).
- **Trust Attributes:** Subtract points for verified tenure (e.g. -20 for accounts active >90 days with zero declines, -15 for harmonious domestic routing).
- **Bounding:** Normalized between 0 and 100 points.

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Shopper / Merchant Browser                      │
│                                                                        │
│   [ React 19 + TypeScript + Tailwind CSS v4 + AG Grid Community ]      │
│   ├── /dashboard       ── Real-time security metrics & triage feed     │
│   ├── /investigation   ── 4-section evidence & counterfactual review   │
│   ├── /checkout        ── Interactive Sandbox Storefront               │
│   ├── /audit           ── Tamper-evident SQLite audit trail            │
│   └── /settings        ── PayPal Sandbox credentials & APIMatic specs  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP REST (/api/...)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express + TypeScript Server (Port 5000)             │
│                                                                        │
│   ├── /api/orders      ── Transaction evaluation & manual override     │
│   ├── /api/paypal      ── Pre-capture verification, create & capture   │
│   ├── /api/audit       ── Audit trail querying                         │
│   └── /api/health      ── Health checks & environment status           │
│                                                                        │
│   ┌─────────────────────┐  ┌──────────────────────┐  ┌──────────────┐ │
│   │ Explainable Engine  │  │ Calibrated Classifier│  │ PayPalClient │ │
│   │ (rules.ts)          │  │ (classifier.ts)      │  │ (OAuth2 SDK) │ │
│   └─────────────────────┘  └──────────────────────┘  └──────────────┘ │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │ SQLite Database (payshield.db — WAL mode, foreign keys enforced) │ │
│   └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│       PayPal Sandbox API Gateway (https://api-m.sandbox.paypal.com)     │
│       ├── POST /v1/oauth2/token                                        │
│       ├── POST /v2/checkout/orders                                     │
│       └── POST /v2/checkout/orders/{id}/capture                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Frontend
- **React 19** & **TypeScript** — Modern component-driven UI
- **Vite 8** — High-performance module bundler and dev server
- **Tailwind CSS v4** (`@tailwindcss/vite`) — Contemporary fintech dark navy design system
- **AG Grid Community Edition** (`ag-grid-react`, `ag-grid-community`) — High-throughput transaction triage feed
- **Lucide React** — Crisp iconography
- **@paypal/react-paypal-js** — PayPal JavaScript SDK integration

### Backend
- **Node.js (v18+)** with **ES Modules**
- **Express 4** & **TypeScript** (`tsx` dev runner) — Lightweight REST API
- **better-sqlite3** — High-speed embedded database with WAL (Write-Ahead Logging)
- **Zod** — Schema validation and type inference
- **dotenv** & **cors** — Environment configuration and cross-origin resource sharing

### Quality & Testing
- **Vitest 3** — Unit and integration test runner
- **Oxlint** — High-performance JavaScript/TypeScript linter
- **Concurrently** — Coordinated multi-service local development

---

## 📦 Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher (v20+ or v22+ recommended)
- **npm**: v9.0.0 or higher
- **Git**: Installed and configured

Check versions:
```bash
node -v
npm -v
git --version
```

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/PayShield-AI.git
cd "PayShield-AI"
```

### 2. Install Dependencies
Install dependencies for the root coordinator, backend server, and frontend client:
```bash
# Install root orchestration dependencies
npm install

# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client
```

### 3. Configure Environment Variables
Copy the `.env.example` template to `server/.env`:
```bash
# On Linux / macOS / Git Bash:
cp .env.example server/.env

# On Windows PowerShell:
Copy-Item .env.example server/.env
```

> **Note:** PayShield AI works out of the box with the default placeholder credentials using its built-in offline mock sandbox! Setting up live PayPal credentials is completely optional.

---

## 🚀 Running the Application

### Option A: Run Concurrently (Recommended)
Launch both the backend API server and the frontend client simultaneously with a single command from the project root:
```bash
npm run dev
```

### Option B: Run Services Individually
Open two terminal windows:

**Terminal 1 — Backend API Server:**
```bash
npm run dev:server
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend Client:**
```bash
npm run dev:client
# Vite client starts at http://localhost:5173
```

### Application URLs
| Service | URL | Description |
| :--- | :--- | :--- |
| **Merchant Dashboard** | [http://localhost:5173](http://localhost:5173) | Security health overview, metric cards, and AG Grid stream |
| **Forensic Investigation** | [http://localhost:5173/investigation](http://localhost:5173/investigation) | Evidence attribution, counterfactuals, and narrative |
| **Sandbox Storefront** | [http://localhost:5173/checkout](http://localhost:5173/checkout) | Interactive test checkout simulating benign and attack patterns |
| **Audit Ledger** | [http://localhost:5173/audit](http://localhost:5173/audit) | Immutable SQLite transaction and override audit trail |
| **Settings & Specs** | [http://localhost:5173/settings](http://localhost:5173/settings) | Gateway vitals, policy thresholds, and APIMatic schemas |
| **Backend API Health** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | System vitals and PayPal connection status |

---

## 🔑 Configuring PayPal Sandbox

To connect PayShield AI to your live PayPal Developer Sandbox:

1. **Sign in to the PayPal Developer Portal:**
   Visit [https://developer.paypal.com/dashboard/](https://developer.paypal.com/dashboard/) and log in with your PayPal credentials.
2. **Access Sandbox Credentials:**
   In the left sidebar, navigate to **Apps & Credentials** and ensure the **Sandbox** toggle is selected.
3. **Create or Select an App:**
   Select your default application or click **Create App** (e.g. name it `PayShield-Sandbox`).
4. **Copy API Keys:**
   Copy the **Client ID** and **Secret Key**.
5. **Update `server/.env`:**
   ```env
   PAYPAL_CLIENT_ID=your_actual_sandbox_client_id_here
   PAYPAL_CLIENT_SECRET=your_actual_sandbox_client_secret_here
   PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
   ```
6. **Restart the Backend Service:**
   Restart `npm run dev`. Navigate to **Settings** in the dashboard to confirm the PayPal status reflects `LIVE_SANDBOX`.

### Built-in Zero-Config Mock Mode
If no credentials are supplied (or placeholders remain), PayShield AI automatically detects this and falls back to **Offline Mock Mode**:
- Simulated orders return synthetic PayPal order IDs (`PAYPAL-SANDBOX-XXXXX`).
- Capture calls return mock authorization references (`CAP-XXXXX`).
- Zero network requests are made to external PayPal servers, ensuring a reliable offline demo experience.

---

## 🧪 Testing & Quality Checks

PayShield AI includes a comprehensive suite of automated tests, type checks, and linters:

### 1. Run Backend Unit & Integration Tests
Runs the Vitest test suite validating rule attribution, threshold classification, and counterfactual generation:
```bash
npm test
```
Or directly in the server directory:
```bash
npm run test --prefix server
```

### 2. Run Full Production Build
Compiles TypeScript for both the backend server and frontend client:
```bash
npm run build
```

### 3. Run Frontend Linter
Executes Oxlint across all client components and pages:
```bash
npm run lint --prefix client
```

### 4. Interactive Simulation Testing
Navigate to the **Sandbox Storefront** (`/checkout`) in your browser to test 5 realistic checkout archetypes:
1. **Clean Shopper:** Domestic residential checkout ($45.00) ➔ Classified as `ALLOW` ➔ Instant PayPal capture.
2. **Anonymous VPN:** Residential shipping with commercial datacenter VPN ($199.99) ➔ Classified as `REVIEW` ➔ Flagged with counterfactual suggestion.
3. **Card-Testing Attack:** Disposable email, Netherlands proxy IP, 4 recent checkout failures ($649.00) ➔ Classified as `BLOCK` ➔ Pre-capture hold engaged.
4. **High-Ticket Young Account:** $420.00 purchase on a 3-day-old account ➔ Classified as `REVIEW`.
5. **Loyal Customer:** 280-day account tenure with zero declines ➔ Classified as `ALLOW`.

---

## 📂 Project Structure

```text
PayShield AI/
├── .env.example                     # Root environment configuration template
├── .gitignore                       # Multi-tier exclusion for keys, databases, logs
├── package.json                     # Root npm script coordinator
├── package-lock.json
├── render.yaml                      # Declarative 1-click Render cloud deployment blueprint
├── README.md                        # Project documentation
│
├── .mcp/
│   └── apimatic.json                # APIMatic Context Plugin configuration for PayPal v2
│
├── client/                          # Frontend React 19 Application
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts               # Vite bundler with Tailwind CSS & /api proxy
│   ├── public/                      # Static assets & icons
│   └── src/
│       ├── App.tsx                  # Main router and shell layout
│       ├── main.tsx
│       ├── index.css                # Global styles and design tokens
│       ├── components/              # Reusable UI components
│       │   ├── BionisMetricCard.tsx     # KPI metrics with trend indicators
│       │   ├── CounterfactualBox.tsx    # "What Would Change This Decision?" UI
│       │   ├── EvidenceCard.tsx         # Observed facts vs inference attribution
│       │   ├── Navbar.tsx               # Header with environment status badge
│       │   ├── RiskBadge.tsx            # ALLOW / REVIEW / BLOCK badge
│       │   ├── SecurityCharts.tsx       # Timeline trend & category radar charts
│       │   ├── SecurityInsightCards.tsx # Gateway vitals and AI predictions
│       │   ├── SecurityScoreDonut.tsx   # Visual security health meter
│       │   ├── StatCard.tsx
│       │   └── TransactionGrid.tsx      # AG Grid Community triage feed
│       ├── pages/
│       │   ├── Dashboard.tsx            # Main merchant command center
│       │   ├── Investigation.tsx        # 4-section evidence & forensic breakdown
│       │   ├── SandboxCheckout.tsx      # Interactive storefront simulation
│       │   ├── AuditTrail.tsx           # Tamper-evident transaction ledger
│       │   └── Settings.tsx             # PayPal credentials & APIMatic schemas
│       ├── services/
│       │   └── api.ts                   # Typed API service client
│       └── types/
│           └── index.ts                 # Shared TypeScript interfaces
│
└── server/                          # Backend Express & Risk Engine Service
    ├── .env.example                 # Backend environment variable template
    ├── .gitignore
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── server.ts                # Express app entrypoint & middleware
    │   ├── config.ts                # Centralized environment configuration
    │   ├── types/
    │   │   └── index.ts             # Domain models (Transaction, Assessment, Audit)
    │   ├── db/
    │   │   ├── database.ts          # better-sqlite3 wrapper with WAL mode
    │   │   ├── schema.sql           # DDL schema (transactions, assessments, audits)
    │   │   └── seeds.ts             # Synthetic benchmark seed transactions
    │   ├── engine/
    │   │   ├── rules.ts             # Deterministic rules across 5 signal categories
    │   │   ├── explainability.ts    # ExplainableRiskEngine & counterfactual logic
    │   │   └── classifier.ts        # Calibrated logistic regression classifier
    │   ├── routes/
    │   │   ├── orders.ts            # Order evaluation, details, and overrides
    │   │   ├── paypal.ts            # Pre-capture PayPal creation & capture
    │   │   └── audit.ts             # Tamper-evident audit log query endpoints
    │   ├── services/
    │   │   └── paypalClient.ts      # PayPal REST v2 client with OAuth2 token caching
    │   └── specs/
    │       └── paypalV2Schema.ts    # Zod schemas for PayPal Orders v2 contract
    └── tests/
        └── riskEngine.test.ts       # Vitest automated test suite
```

---

## 🔒 Security & Privacy Practices

- **Zero Sensitive Card Data:** PayShield AI strictly adheres to PCI-DSS scope reduction. Credit card numbers, expiration dates, and CVVs are never handled, logged, or stored by PayShield servers.
- **Server-Side Secret Isolation:** PayPal Client IDs, Client Secrets, and OAuth2 bearer tokens reside exclusively on the backend server and are never exposed to the client browser.
- **Environment Exclusions:** Comprehensive `.gitignore` rules prevent `.env` files, credentials, and local databases (`*.db`, `*.db-wal`, `*.db-shm`) from ever being committed to Git.
- **Pre-Capture Interception:** High-risk transactions are halted before payment authorization, eliminating fraud chargeback liability.
- **Tamper-Evident Auditing:** Every decision, manual override, and capture event is stored immutably with timestamps and policy version signatures.
- **Ethical AI Baseline:** Risk scoring is grounded strictly in technical and behavioral telemetry anomalies (e.g. proxy detection, velocity spikes), never demographic profiling.

---

## ☁️ Deployment (Render Blueprint)

PayShield AI is fully packaged for 1-click cloud deployment via the included [`render.yaml`](./render.yaml) blueprint:

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render automatically configures:
   - **`payshield-api`**: Node.js Express Web Service (Backend)
   - **`payshield-ui`**: Vite React Static Site (Frontend) with automated `/api/*` rewrite routing
5. Fill in your optional `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in the Render environment variables prompt.

---

## 📄 License

This project is licensed under the **MIT License**. Built for the **PayPal AI Hackathon 2026**.
