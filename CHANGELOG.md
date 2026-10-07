# Changelog

All notable changes to `estamora-app` are recorded here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-07

### Added
- **Production React 19 + Vite DApp Deployment**:
  - Live at `https://estamora-app.vercel.app`.
- **Milestone Escrow & Checkout Portal**:
  - Payer/merchant milestone definition, auto-refund timeouts, and arbiter assignment.
  - Interactive testbed with pre-filled sample contracts and simulation toggles.
- **Freighter Wallet Integration**:
  - Seamless Stellar Freighter wallet connection with fallback keypair generation.
- **Pre-flight Simulation Engine**:
  - Live scorecard verifying transaction viability, authorization requirements, and gas bounds before submitting.
- **Autonomous Agent Spend Firewall**:
  - Merchant console for setting rolling 24-hour spend caps and inspecting delegated execution limits.
- **Dispute Resolution Console**:
  - Milestone claim validation, dispute raising, and mediator payout split controls.
