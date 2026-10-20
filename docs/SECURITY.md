# Security & Privacy Policy — PayShield AI

> **Security Posture, Data Protection, and Ethical AI Standards**  
> Built for the **PayPal AI Hackathon 2026**

---

## 1. Security Architecture Principles

PayShield AI is architected from the ground up to minimize attack surfaces and eliminate compliance liabilities:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Security Defense-in-Depth                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Zero Cardholder Data Handling (PCI-DSS Scope Reduction)             │
│ 2. Pre-Capture Risk Interception (Chargeback & Fee Prevention)         │
│ 3. Server-Side Credential & Token Isolation                            │
│ 4. Parameterized SQL Execution (Zero SQL Injection)                   │
│ 5. Tamper-Evident Immutable Event Auditing                             │
│ 6. Ethical, Technical-Only Risk Attribution (Zero Demographic Profiling│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cardholder Data & PCI-DSS Scope Reduction

- **Zero PAN / CVV Storage:** PayShield AI **never** collects, processes, transmits, or stores primary account numbers (PAN), card verification values (CVV/CVC), or expiration dates.
- Payment authorizations and card data handling are completely delegated to the **PayPal Sandbox Gateway** via PayPal's official JavaScript SDK and REST API.
- PayShield AI only inspects transactional metadata (amount, currency, item count) and security telemetry (IP geolocation, device flags, velocity metrics).

---

## 3. Pre-Capture Risk Interception

Traditional payment processors assess fraud *post-authorization*, exposing merchants to payment processor fees and chargebacks.

PayShield AI enforces a **Pre-Capture Firewall**:
1. When a transaction is submitted, the in-process risk engine evaluates it immediately.
2. If the calculated risk score exceeds the `RISK_THRESHOLD_REVIEW` (default: 65), the backend returns `HTTP 403 Forbidden` with a structured `BLOCK` reason.
3. The PayPal order is **never created or captured**, arresting adversarial transactions before any financial settlement can occur.

---

## 4. Credential & Secret Management

- **Server-Side Secret Isolation:** PayPal `CLIENT_SECRET` and OAuth2 Bearer tokens reside exclusively on the backend server environment. They are never sent to the frontend client or included in client bundle outputs.
- **Multi-Tier Git Exclusions:** The root [`.gitignore`](../.gitignore) strictly excludes:
  - All `.env` and `.env.*` files (only `.env.example` templates are tracked).
  - All local database and WAL cache files (`*.db`, `*.db-wal`, `*.db-shm`).
  - All build artifacts and compiler caches (`dist/`, `*.tsbuildinfo`).
- **Placeholder Safety:** The repository contains zero hardcoded credentials. All configuration is read via `process.env` with safe offline mock fallbacks.

---

## 5. Database & Injection Defenses

- All database operations in [`database.ts`](../server/src/db/database.ts) use **parameterized prepared statements** provided by `better-sqlite3`:
  ```typescript
  const stmt = db.prepare(`
    INSERT INTO transactions (order_id, amount, ...)
    VALUES (@orderId, @amount, ...)
  `);
  stmt.run({ orderId: tx.orderId, amount: tx.amount, ... });
  ```
- No user-controlled strings are ever interpolated into SQL queries, eliminating SQL injection vulnerabilities.
- Verified by automated tests in [`investigationAndSecurity.test.ts`](../server/tests/investigationAndSecurity.test.ts).

---

## 6. Tamper-Evident Audit Logging

Every critical security event is immutably logged into the `audit_logs` table:
- **Logged Events:** Initial risk assessment, PayPal order creation, PayPal capture, and merchant manual decision overrides.
- **Audit Attributes:** Unique event ID, order ID, action type, actor (`SYSTEM_AGENT` or `MERCHANT_ANALYST`), policy version, timestamp, and full JSON state diff.

---

## 7. Ethical AI & Bias Mitigation

- **Telemetry Over Identity:** PayShield AI measures **technical inconsistencies and adversarial behaviors** (e.g. cross-border proxy hops, disposable email domain generation, rapid velocity bursts), rather than personal or demographic attributes.
- **Transparent Explainability:** Every point scored is attributed to an explicit factor, separating observed facts from model inferences.
- **Actionable Counterfactuals:** The system provides transparent paths for legitimate customers to verify their identity (e.g. 3D-Secure challenge) rather than arbitrary permanent bans.

---

## 8. Reporting Security Issues

If you identify a security issue or vulnerability in PayShield AI:
1. Please **do not** open a public GitHub issue.
2. Contact the project maintainer directly at: `arigelaharsha888@gmail.com`.
3. Provide a detailed summary, reproducible steps, and potential impact.
