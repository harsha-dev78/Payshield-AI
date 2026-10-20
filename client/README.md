# PayShield AI — Frontend Client (`client/`)

> **React 19 + TypeScript + Vite + Tailwind CSS v4 + AG Grid Community**  
> Built for the **PayPal AI Hackathon 2026**

---

## 🌟 Overview
The PayShield AI client provides a real-time security operations center and customer sandbox storefront for e-commerce fraud prevention:

- **Dashboard (`/`)**: Overview security health donut meter, 4 KPI cards (Total Analyzed, Intercepted Attacks, Fraud Rate, Avg Latency), and the live AG Grid triage table.
- **Investigation (`/investigation`)**: Deep-dive forensic workbench showing:
  - *Telemetry Facts vs. Inferences* side-by-side cards.
  - *Factor Impact Waterfall* breaking down positive and negative risk weights.
  - *Actionable Counterfactual Box* showing mathematical point reduction conditions.
  - *Investigation Report Modal* providing a clean, printable PDF-style summary.
- **Sandbox Storefront (`/checkout`)**: Interactive customer checkout simulation loaded with 5 distinct risk personas to demonstrate live pre-capture intervention.
- **Audit Trail (`/audit`)**: Immutable log table displaying timestamped events, policy versions, and JSON diffs.
- **Settings (`/settings`)**: PayPal Sandbox connection diagnostic, threshold policy sliders, and APIMatic contract validator.

---

## 🚀 Running Locally

```bash
# From within the client/ directory:
npm run dev

# Or from project root:
npm run dev:client
```
The Vite development server runs at `http://localhost:5173/`. API requests to `/api` are automatically proxied to `http://localhost:5000` via `vite.config.ts`.

---

## 🧪 Testing & Linting

```bash
# Run Oxlint linter:
npm run lint

# Run production build:
npm run build
```
