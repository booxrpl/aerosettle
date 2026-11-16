# AEROSETTLE — Global Aviation Payment & XRPL Settlement Platform

AeroSettle is an enterprise B2B aviation payment, treasury, and cross-border settlement platform powered by the **XRP Ledger (XRPL)**. It streamlines international supplier settlements between commercial airlines, aircraft operators, jet fuel uplift providers, EASA/FAA MRO overhaul facilities, AOG parts distributors, aircraft lessors, and airport ground handling companies.

---

## 1. Architecture & Core Modules

- **Frontend & UI (`src/app/page.tsx`, `src/components/`)**:
  - Built with **Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Lucide Icons** using an enterprise dark-navy (`#0a1929`) and crisp white (`#ffffff`) financial design system inspired by Stripe Dashboard, Mercury, and Ramp.
  - Complete 9-module enterprise navigation:
    1. **Executive Dashboard**: 8 core KPIs, monthly XRPL vs. legacy wire activity chart, currency/hub exposure breakdown, recent settlements, and live compliance feed.
    2. **Payments & Approval Queue**: Multi-step payment creation & review wizard (`Configure -> Review Quote & Governance -> Submit -> Detailed Confirmation Receipt`), supporting all 7 payment statuses (`DRAFT`, `AWAITING_APPROVAL`, `PROCESSING`, `PENDING_SETTLEMENT`, `COMPLETED`, `FAILED`, `CANCELLED`) and dual-control cryptographic approvals.
    3. **International Settlement**: Interactive aviation corridor matrix (`KJFK → OMDB Dubai`, `KJFK → EDDF Frankfurt`, `KLAX → WSSS Singapore`, `KMIA → SBGR São Paulo`, `EHAM → EGLL London`, plus unsupported corridor `KJFK → UAAA Almaty`), rail cost/speed simulator (`XRPL_BRIDGE` vs `RLUSD_STABLECOIN` vs `SWIFT_GPI` / `SEPA_INSTANT`), XRPL network selector (`SIMULATION_SANDBOX`, `XRPL_TESTNET`, `XRPL_MAINNET`), and live `tx` RPC hash verifier.
    4. **Beneficiaries & Suppliers**: Directory of verified international aviation suppliers with EASA/FAA certificates, IATA fuel codes, IBAN/SWIFT details, XRPL classic addresses & destination tags, KYB status, and OFAC/EU sanctions screening status.
    5. **Aviation Invoices**: Multi-line invoice creation with fixed-point decimal calculation, SHA-256 document hash generation, aircraft tail & ICAO station metadata, and one-click **Pay & Reconcile** 3-way matching.
    6. **Multi-Currency Treasury**: Explicit separation between linked external fiat bank accounts (`EXTERNAL_BANK_LINKED`), non-custodial KMS/HSM XRPL signers (`NON_CUSTODIAL_XRPL_SIGNER`), external regulated stablecoin vaults (`EXTERNAL_CUSTODY_VAULT`), and indicative USD valuations.
    7. **Transaction History**: Multi-filter searchable ledger with CSV & JSON audit receipt exports.
    8. **Analytics & Reporting**: Regional volume distribution, supplier settlement velocity, FX spread savings, and executive CSV reporting.
    9. **Settings, RBAC & Audit Trail**: Company onboarding & governance policy configuration, interactive 5-role session switcher (`ADMINISTRATOR`, `FINANCE_MANAGER`, `PAYMENT_APPROVER`, `FINANCE_OPERATOR`, `READ_ONLY_AUDITOR`), RBAC permission matrix, and SHA-256 hash-chained audit log.

- **Precise Decimal Arithmetic (`src/lib/decimal.ts`)**:
  - Uses scaled `BigInt` micro-units (`10^6`, matching exact XRP drops where `1 XRP = 1,000,000 drops`) and `10^8` FX rate scaling to eliminate IEEE-754 floating-point errors.

- **XRP Ledger Service Layer (`src/services/xrpl-service.ts`)**:
  - Built against official XRPL documentation (`https://xrpl.org/docs`).
  - Supports live JSON-RPC calls (`account_info`, `tx`) against XRPL Testnet (`https://s.altnet.rippletest.net:51234/`) and Mainnet (`https://xrplcluster.com/`), while isolating `SIMULATION_SANDBOX` mode.
  - **Strict Simulation Isolation**: Simulated payments never fabricate fake 64-character hexadecimal on-chain transaction hashes (`txHash` is strictly `null` and `simulationTraceId` is prefixed with `SIM-XRPL-...`).
  - Explicitly distinguishes:
    1. `SIMULATED_PAYMENT`
    2. `SUBMITTED_BLOCKCHAIN_TX`
    3. `VALIDATED_ON_CHAIN_TX`
    4. `COMPLETED_EXTERNAL_FIAT_SETTLEMENT`

- **Relational Database Schema (`prisma/schema.prisma` & `src/db/store.ts`)**:
  - Full 17-model PostgreSQL + Prisma schema (`User`, `Company`, `CompanyMembership`, `RolePermission`, `Beneficiary`, `SupplierProfile`, `Invoice`, `InvoiceLineItem`, `Payment`, `PaymentApproval`, `Transaction`, `CurrencyExchangeQuote`, `Account`, `WalletReference`, `XrplTransactionRecord`, `AuditLog`, `Notification`) with local JSON persistence (`data/aerosettle-db.json`) for zero-configuration local execution.

---

## 2. External Credentials & Production Integration Requirements

AeroSettle runs out-of-the-box in **Isolated Simulation & Demo Mode** without external API keys. For live production deployment, configure the following in `.env`:

1. **`DATABASE_URL`**: PostgreSQL connection string for Prisma ORM persistence.
2. **`XRPL_EXECUTION_MODE` & `XRPL_SERVER_SIGNER_SEED`**: Server-side HSM/KMS signer configuration for broadcasting signed `Payment` transactions to XRPL Testnet or Mainnet. Private keys are never exposed to the frontend.
3. **Licensed Local Liquidity & Fiat Off-Ramp Partners**: XRP settles the cross-border digital asset leg between regulated institutions; final disbursement into supplier bank accounts (`UAEFTS`, `SEPA Instant`, `FAST`, `PIX`) requires commercial API credentials with licensed regional liquidity providers and jurisdiction-specific KYB/AML review.
