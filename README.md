# 🛡️ PayShield AI — AI-Powered Payment Security Agent

> **An evidence-based payment security assistant and pre-capture gateway interceptor for small online merchants.**  
> Built for the **PayPal AI Hackathon 2026** • Strictly **$0 Development & Hosting Budget**.

---

## 🏆 Hackathon Award Alignment

| Award Category | How PayShield AI Implements It | Sponsor Technology |
| :--- | :--- | :--- |
| **Best Use of PayPal + AI** | Uses transparent AI scoring and telemetry fact attribution to intercept orders **before** PayPal capture; validates order contracts server-side and logs completed payments in a tamper-evident audit trail. | **PayPal Sandbox Orders v2 API** |
| **Best Overall** | Complete, working end-to-end fintech cybersecurity application: interactive storefront demo, triage dashboard, evidence inspection, counterfactuals, and audit logging. | **Full-Stack $0 Architecture** |
| **Best Use of AG Grid** | High-throughput fintech transaction triage feed with custom dark navy theming, multi-column filtering by risk tier, sorting, customer search, and interactive row inspection. | **AG Grid Community (MIT License)** |
| **Best Use of APIMatic** | Server-to-server PayPal v2 Orders contract verified against canonical APIMatic MCP specifications, complete with an in-app interactive API contract validator. | **APIMatic Context Plugin & Schemas** |
| **Best Use of Render** | Zero-cost 1-click cloud infrastructure blueprint (`render.yaml`) declaring backend Web Service and frontend Static Site. | **Render Blueprint & Workflows** |

---

## 🌟 Key Differentiating Features

### 1. Evidence-to-Action Investigation
Unlike opaque fraud scorecards, PayShield AI separates **observed telemetry facts** (e.g., *"IP country resolves to NL, whereas shipping destination is US"*) from **heuristic risk inferences**. Analysts see exactly which signals contributed to a score.

### 2. "What Would Change This Decision?" (Counterfactual Reasoning)
PayShield AI never automatically presumes a customer is a criminal. It generates actionable verification conditions that would objectively lower the risk score (e.g., *"If buyer completes 3D-Secure challenge: -30 pts"* or *"If domestic residential IP is verified: -22 pts"*).

### 3. Pre-Capture PayPal Sandbox Interceptor
High-risk orders are intercepted **prior to authorization**, preventing unverified captures. Permitted orders create official PayPal Orders on the backend and seamlessly authorize via PayPal Sandbox.

### 4. Dual-Model Architecture (Deterministic + ML Ensemble)
- **Primary:** Transparent, deterministic heuristic engine with factor impact attribution (Geography, Velocity, Network, Behavioral, Financial).
- **Secondary:** In-process Logistic Regression & Tree classifier predicting statistical anomaly probability alongside a grounded AI narrative.

### 5. Tamper-Evident SQLite Audit Trail
Every assessment, policy version, PayPal order creation, capture, and merchant override is immutably logged into local SQLite.

---

## 🏗️ System Architecture

```text
[ Shopper / Demo Storefront ]
           │
           ▼
[ React 19 + Vite + Tailwind CSS + AG Grid Community ]
           │  (REST API /api/...)
           ▼
[ Express + TypeScript Server (Port 5000) ]
   ├── Explainable Heuristic Engine (Deterministic Rules)
   ├── Lightweight ML Classifier (Logistic Ensemble)
   ├── APIMatic PayPal v2 Schema Validator
   ├── Official PayPal REST Client (OAuth2 Bearer Tokens)
   └── SQLite Database (payshield.db — WAL mode)
           │
           ▼
[ PayPal Sandbox Gateway (https://api-m.sandbox.paypal.com) ]
```

---

## 🚀 Quickstart Guide ($0 Local Run)

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/payshield-ai.git
cd "PayShield AI"

# Install root, backend, and frontend packages
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Configure Environment (Optional)
A pre-configured `.env` is provided for immediate demo use. To connect your free PayPal Sandbox account:
```bash
# In server/.env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

### 3. Run Both Frontend and Backend Concurrently
From the project root:
```bash
npm run dev
```
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)

### 4. Run Automated Test Suite
```bash
npm test
```

---

## ☁️ 1-Click Render Deployment

PayShield AI includes a declarative [`render.yaml`](./render.yaml) blueprint:
1. Fork or push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Connect your repository. Render will automatically spin up:
   - `payshield-api`: Node.js Express Web Service
   - `payshield-ui`: Vite React Static Site
4. Apply your $50 hackathon credit to run persistent instances!

---

## 🔒 Security & Privacy Guarantees

- **No Sensitive Card Data:** Zero credit card numbers, CVVs, or PINs are collected or stored.
- **Server-Side Secrets:** PayPal Client Secret and OAuth tokens reside strictly in `server/.env`.
- **Pre-Capture Risk Interception:** High-risk orders are arrested before payment capture.
- **Idempotency & Double-Capture Guard:** SQLite status locks prevent duplicate charges.
- **Ethical AI:** Anomaly detection measures transactional deviation, not demographic profile.

---

## 📄 License
MIT License • Built with pride for the PayPal AI Hackathon 2026.
