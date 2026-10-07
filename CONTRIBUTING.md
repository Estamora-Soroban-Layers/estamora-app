# Contributing to Estamora App

Thank you for contributing to `estamora-app`! This repository contains the merchant and buyer web application for the Estamora Stellar Payment and Escrow Protocol.

## Local Development

```bash
git clone https://github.com/Estamora-Soroban-Layers/estamora-app.git
cd estamora-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

## Guidelines

1. **User Experience**: The checkout and escrow management flow should remain intuitive, clear, and responsive.
2. **Safety Warnings**: Ensure simulation pre-flight warnings and spend cap threshold indicators are prominently displayed.
3. **Wallet Interoperability**: Support standard Stellar wallet connectors (e.g. `@stellar/freighter-api`).
