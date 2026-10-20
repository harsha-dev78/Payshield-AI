# Testing & Quality Verification Guide — PayShield AI

> **Verification Strategy, Automated Test Suites, and Quality Standards**  
> Built for the **PayPal AI Hackathon 2026** • 100% Passing Automated Tests

---

## 1. Quality Assurance Overview

PayShield AI enforces high test reliability across its risk decisioning, payment gateway interception, and tamper-evident audit subsystems:

```text
┌─────────────────────────────────────────────────────────────┐
│                   Automated Quality Layers                  │
├───────────────────────────────┬─────────────────────────────┤
│ 1. Static Analysis & Linting  │ Oxlint (Client)             │
│ 2. Backend Automated Tests    │ Vitest 3 (11/11 Passing)    │
│ 3. Type Checking & Compiles   │ TypeScript tsc              │
│ 4. Interactive Simulation     │ 5 Risk Archetypes Storefront│
└───────────────────────────────┴─────────────────────────────┘
```

---

## 2. Automated Backend Test Suites (Vitest)

All backend tests are written using **Vitest** and located in [`server/tests/`](../server/tests/). They run in-process against an isolated SQLite test database with zero external network dependencies.

### Summary of Automated Suites:
| Test Suite File | Test Count | Focus Area |
| :--- | :---: | :--- |
| [`riskEngine.test.ts`](../server/tests/riskEngine.test.ts) | 3 | Heuristic attribution, baseline scoring, and counterfactual generation. |
| [`investigationAndSecurity.test.ts`](../server/tests/investigationAndSecurity.test.ts) | 5 | Evidence separation, manual overrides, audit logging, and SQL injection safety. |
| [`paypalAndApiWorkflows.test.ts`](../server/tests/paypalAndApiWorkflows.test.ts) | 3 | Pre-capture gateway interception, mock order creation, and capture idempotency. |
| **Total** | **11 Passed** | **100% Pass Rate** |

---

### Detailed Test Specifications

#### Suite 1: `server/tests/riskEngine.test.ts`
1. **Rule Evaluation Across All 5 Categories**: Validates that telemetry signals correctly trigger positive and negative point adjustments across Geography, Network, Velocity, Behavioral, and Financial dimensions.
2. **Baseline Scoring & Bounding**: Confirms that starting baseline risk is properly added and final risk scores remain strictly clamped between `0` and `100`.
3. **Counterfactual Point Reductions**: Verifies that actionable conditions (e.g. 3D-Secure completion, domestic residential IP) calculate mathematically sound point deductions.

#### Suite 2: `server/tests/investigationAndSecurity.test.ts`
1. **Transaction Retrieval**: Confirms that fetching an order returns the complete structured risk assessment with factor impacts and telemetry json.
2. **Fact vs. Inference Attribution**: Asserts that every factor impact object is explicitly tagged as either `"fact"` (observed telemetry) or `"inference"` (heuristic model deduction).
3. **Manual Override & Audit Logging**: Verifies that when an analyst overrides a decision (e.g. from `REVIEW` to `ALLOW`), an immutable record is inserted into `audit_logs` with actor attribution.
4. **SQL Injection Defense**: Tests that malicious inputs in order IDs or customer names (e.g. `' OR 1=1; --`) are neutralized by SQLite parameterized queries.
5. **Not Found Handling**: Verifies proper `404` error payload when querying non-existent order IDs.

#### Suite 3: `server/tests/paypalAndApiWorkflows.test.ts`
1. **Pre-Capture Interception of High-Risk Orders**: Simulates an order with risk score > 65 and confirms that `POST /api/paypal/create-order` halts the transaction with `HTTP 403 Forbidden` *before* contacting PayPal.
2. **Mock Sandbox Order Creation**: Validates that approved transactions successfully generate realistic synthetic PayPal order IDs (`PAYPAL-SANDBOX-XXXXX`) in mock mode.
3. **Double-Capture Prevention (Idempotency)**: Verifies that attempting to capture an already-captured order is rejected with an appropriate status error.

---

## 3. Running Automated Tests

### Run Backend Vitest Suite
```bash
# From repository root:
npm test

# Or directly in server directory:
npm run test --prefix server
```

Expected output:
```text
 ✓ tests/riskEngine.test.ts (3 tests)
 ✓ tests/investigationAndSecurity.test.ts (5 tests)
 ✓ tests/paypalAndApiWorkflows.test.ts (3 tests)

 Test Files  3 passed (3)
      Tests  11 passed (11)
```

### Run Frontend Linter (Oxlint)
```bash
npm run lint --prefix client
```

### Run Full Production Build
```bash
npm run build
```
Ensures that TypeScript compiles without errors in both client and server workspaces.

---

## 4. Interactive Simulation & Persona Testing

PayShield AI includes an interactive **Sandbox Storefront** (`http://localhost:5173/checkout`) loaded with 5 pre-configured personas to test benign and adversarial payment behaviors:

| Persona | Scenario & Signals | Expected Tier | Pre-Capture Action |
| :--- | :--- | :---: | :--- |
| **Clean Shopper** | Domestic US residential IP, matching billing & shipping, verified tenure. | `ALLOW` | Instant PayPal order creation and capture approved. |
| **Anonymous VPN** | Residential shipping destination, but IP resolves to a commercial datacenter VPN. | `REVIEW` | Flagged for review; counterfactual suggests residential checkout or 3DS. |
| **Card-Testing Attack** | Disposable email (`@tempmail.com`), Netherlands proxy IP, 4 recent rapid failed attempts. | `BLOCK` | **Pre-capture hold engaged**. PayPal order creation aborted. |
| **High-Ticket Young Account** | $420.00 basket on a 3-day-old unverified account with no purchase history. | `REVIEW` | Flagged due to basket-to-tenure imbalance. |
| **Loyal Customer** | Domestic checkout with 280 days of positive transaction history and zero declines. | `ALLOW` | Point reduction applied for verified tenure; instant capture approved. |
