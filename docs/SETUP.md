# Setup & Installation Guide — PayShield AI

> **Step-by-Step Installation, Configuration, and Deployment Guide**  
> Built for the **PayPal AI Hackathon 2026** • $0 Cost Reproduction

---

## 1. System Prerequisites

Before getting started, verify that your environment meets the minimum version requirements:

| Tool | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v18.0.0` | `v20.x` or `v22.x` | `node -v` |
| **npm** | `v9.0.0` | `v10.x` or higher | `npm -v` |
| **Git** | `v2.30.0` | Latest | `git --version` |

---

## 2. Local Development Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/harsha-dev78/Payshield-AI.git
cd Payshield-AI
```

### Step 2: Install Dependencies
Install dependencies for the root coordinator, backend server, and frontend client:

```bash
# Install root coordinator packages (concurrently)
npm install

# Install server packages (Express, better-sqlite3, Zod, Vitest)
npm install --prefix server

# Install client packages (React 19, Vite, Tailwind CSS, AG Grid)
npm install --prefix client
```

### Step 3: Configure Environment Variables
Copy the root `.env.example` template to `server/.env`:

```bash
# macOS / Linux / Git Bash:
cp .env.example server/.env

# Windows PowerShell:
Copy-Item .env.example server/.env
```

> **Zero-Config Guarantee:** PayShield AI works out of the box with the default placeholder credentials. If no live PayPal credentials are provided, it automatically enters its built-in **Offline Mock Sandbox Mode**, allowing immediate local evaluation without external network dependencies.

---

## 3. Running the Application

### Option A: Run Concurrently (Recommended)
From the root directory, start both the backend API server and frontend client simultaneously:
```bash
npm run dev
```

### Option B: Run in Separate Terminals

**Terminal 1 — Backend API Server:**
```bash
npm run dev:server
# Server listens on http://localhost:5000
```

**Terminal 2 — Frontend Client:**
```bash
npm run dev:client
# Vite client starts on http://localhost:5173
```

### Key Local Endpoints
| View / API | URL | Purpose |
| :--- | :--- | :--- |
| **Merchant Dashboard** | `http://localhost:5173/` | Real-time triage feed and security KPIs |
| **Forensic Investigation** | `http://localhost:5173/investigation` | 4-pillar evidence breakdown and report generation |
| **Sandbox Storefront** | `http://localhost:5173/checkout` | Live checkout simulation with 5 risk personas |
| **Audit Ledger** | `http://localhost:5173/audit` | Tamper-evident SQLite event logs |
| **Settings & Specs** | `http://localhost:5173/settings` | Gateway connection health and APIMatic validator |
| **Backend Health Check** | `http://localhost:5000/api/health` | System vitals, policy version, and DB status |

---

## 4. Connecting Live PayPal Sandbox Credentials (Optional)

To connect the application to real PayPal Sandbox servers:

1. Sign in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. In the navigation sidebar, go to **Apps & Credentials** and select the **Sandbox** toggle.
3. Click **Create App** (or choose an existing Default Application).
4. Copy your **Client ID** and **Secret Key**.
5. Update `server/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   PAYPAL_CLIENT_ID=your_actual_sandbox_client_id_here
   PAYPAL_CLIENT_SECRET=your_actual_sandbox_client_secret_here
   PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
   RISK_THRESHOLD_ALLOW=30
   RISK_THRESHOLD_REVIEW=65
   ```
6. Restart the backend server (`npm run dev`). Open `http://localhost:5173/settings` to verify the connection status displays `LIVE_SANDBOX`.

---

## 5. Production Build & Cloud Deployment (Render)

PayShield AI is pre-configured with a declarative [`render.yaml`](../render.yaml) blueprint for 100% free cloud deployment on Render ($0 budget, no credit card required).

### Deploy via Render Blueprint:
1. Push your repository to your GitHub account.
2. Sign in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your `Payshield-AI` repository and click **Connect**.
5. Render reads `render.yaml` and deploys the unified web service:
   - **Service Name:** `payshield-ai`
   - **Runtime:** `Node`
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
6. Click **Apply**. Within ~2 minutes, your live application will be deployed with public HTTPS at `https://your-service-name.onrender.com`.

> **Note on Free Instance Cold Starts:** Render free-tier services spin down after 15 minutes of idle time. The initial HTTP request may experience a 30–50 second wake-up delay. Subsequent requests respond with sub-second latency.
