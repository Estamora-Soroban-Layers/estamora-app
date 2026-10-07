# Security Policy

## Reporting Vulnerabilities

If you discover any security issue within `estamora-app`, please report it privately through GitHub Security Advisories.

## Web Application Security Guidelines

- **No Key Storage**: The web app never stores unencrypted private keys or seeds in local storage, session storage, or cookies.
- **Client-Side Simulation**: Pre-flight simulation checks are designed to provide early warnings against unintended transactions before wallet confirmation.
- **Content Security**: All network requests connect exclusively to verified Stellar Testnet/Mainnet RPC nodes and Horizon endpoints.
