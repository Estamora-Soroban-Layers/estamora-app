# Estamora App

[![CI](https://github.com/Estamora-Soroban-Layers/estamora-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Estamora-Soroban-Layers/estamora-app/actions/workflows/ci.yml)
[![Live App](https://img.shields.io/badge/Vercel-Live_Production-4ade80.svg)](https://estamora-app.vercel.app)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/Bundle_Size-78_kB_gzipped-blue.svg)](dist)

> **Operator console, interactive checkout simulator, and Freighter wallet integration for the Estamora Payment Protocol on Stellar.**

**Live Application**: **[https://estamora-app.vercel.app](https://estamora-app.vercel.app)**

Part of the **Estamora Payment Protocol**:
- 📜 **[estamora-contracts](https://github.com/Estamora-Soroban-Layers/estamora-contracts)** — Soroban smart contracts in Rust.
- ⚡ **[estamora-sdk](https://github.com/Estamora-Soroban-Layers/estamora-sdk)** — TypeScript client SDK & pre-flight simulation engine.
- 💻 **[estamora-app](https://github.com/Estamora-Soroban-Layers/estamora-app)** — Merchant dashboard and operator console (this repository).
- 📚 **[estamora-docs](https://github.com/Estamora-Soroban-Layers/estamora-docs)** — Technical documentation hub ([Live Docs](https://estamora-docs.vercel.app)).

---

## 1. Features

- 🛡️ **Interactive Milestone Escrow Simulator**: Create, inspect, release, and refund conditional escrows with automated buyer protection.
- 💳 **Freighter Wallet Integration**: Connect your Testnet Freighter wallet to sign transactions directly from the browser.
- ⚡ **Zero-Broadcast Pre-Flight Simulation**: Live scorecard calculating resource fees (stroops), CPU instructions, and required authorization before prompting signatures.
- 🤖 **Autonomous Agent Spend Firewall**: Monitor and test 24-hour rolling quotas and per-transaction limits for automated delegates.
- ⚖️ **Dispute Arbitration Console**: Fair percentage split resolutions between buyers and sellers.
- 📊 **Testnet Telemetry**: Direct links to verified Testnet transaction hashes on Stellar.Expert.

---

## 2. Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Blockchain**: `@stellar/stellar-sdk` & `@stellar/freighter-api`
- **Styling**: Modern CSS Design System (Glassmorphism, Dark Mode, JetBrains Mono, Plus Jakarta Sans)
- **Deployment**: Vercel Edge

---

## 3. Running Locally

```bash
# Clone the repository
git clone https://github.com/Estamora-Soroban-Layers/estamora-app.git
cd estamora-app

# Install dependencies
npm install

# Start local dev server (http://localhost:5173)
npm run dev

# Compile production bundle
npm run build
```

---

## 4. Community & Contributions

- 💬 **Telegram**: [Estamora Community](https://t.me/estamora_stellar)
- 👾 **Discord**: [Estamora Developers](https://discord.gg/estamora-dev)
- 👤 **Maintainer**: [@winningtalker-commits](https://github.com/winningtalker-commits)

---

## 5. License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
