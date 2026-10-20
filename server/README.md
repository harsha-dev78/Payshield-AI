# PayShield AI — Backend Server (`server/`)

> **Node.js (ESM) + Express 4 + TypeScript + better-sqlite3 + Zod**  
> Built for the **PayPal AI Hackathon 2026**

---

## 🌟 Overview
The PayShield AI backend provides in-process, sub-millisecond payment risk evaluation, pre-capture PayPal gateway protection, and immutable SQLite audit logging.

### Key Capabilities:
- **Explainable Risk Engine (`src/engine/rules.ts`)**: Evaluates 5 orthogonal signal categories (Geography, Network, Velocity, Behavioral, Financial) with explicit Fact vs Inference tagging.
- **Statistical ML Classifier (`src/engine/classifier.ts`)**: In-process calibrated logistic regression outputting continuous fraud probabilities.
- **Counterfactual Generator (`src/engine/explainability.ts`)**: Calculates mathematical point deductions for customer verification pathways.
- **PayPal Client (`src/services/paypalClient.ts`)**: Integrates with official PayPal Orders v2 REST API with OAuth2 Bearer token caching and zero-dependency offline mock fallback.
- **SQLite Persistence (`src/db/database.ts`)**: High-speed embedded database running in WAL mode with embedded DDL schemas.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, version metadata, and DB status |
| `POST` | `/api/orders/evaluate` | Evaluates a transaction and returns risk assessment |
| `POST` | `/api/orders/analyze` | Quick simulation scoring endpoint |
| `GET` | `/api/orders` | Query recent transactions |
| `GET` | `/api/orders/:orderId` | Get full transaction details and risk breakdown |
| `POST` | `/api/orders/:orderId/override` | Manual merchant decision override with audit record |
| `POST` | `/api/paypal/create-order` | Pre-capture safety check + PayPal order creation |
| `POST` | `/api/paypal/capture-order` | Captures approved PayPal order with idempotency check |
| `GET` | `/api/paypal/status` | Current PayPal connection and credential health |
| `GET` | `/api/audit` | Query immutable audit log records |

---

## 🚀 Running Locally

```bash
# From within the server/ directory:
npm run dev

# Or from project root:
npm run dev:server
```
Server listens on `http://localhost:5000` (or `PORT` specified in `.env`).

---

## 🧪 Testing

```bash
# Run Vitest automated test suite:
npm test
```
Runs 11 automated test cases across rules, security defenses, and PayPal workflows.
