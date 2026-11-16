import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { DecimalMoney } from "@/lib/decimal";
import {
  AuditLogRecord,
  BeneficiaryRecord,
  CompanyRecord,
  InvoiceRecord,
  NotificationRecord,
  PaymentRecord,
  RolePermissionRecord,
  TransactionLedgerRecord,
  TreasuryAccountRecord,
  UserRecord,
  UserRole,
  WalletReferenceRecord,
  XrplNetworkMode,
} from "@/types/aerosettle";
import {
  convertCurrencyAmount,
  generateModularPaymentQuote,
} from "@/services/payment-rails";
import { buildXrplSettlementRecord } from "@/services/xrpl-service";

export interface AeroSettleDatabaseState {
  isDemoEnvironment: boolean;
  activeUserId: string;
  xrplNetworkMode: XrplNetworkMode;
  company: CompanyRecord;
  users: UserRecord[];
  rolePermissions: RolePermissionRecord[];
  beneficiaries: BeneficiaryRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  transactions: TransactionLedgerRecord[];
  treasuryAccounts: TreasuryAccountRecord[];
  wallets: WalletReferenceRecord[];
  auditLogs: AuditLogRecord[];
  notifications: NotificationRecord[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE_PATH = path.join(DATA_DIR, "aerosettle-db.json");
const TMP_DB_PATH = path.join(os.tmpdir(), "aerosettle-db.json");

declare global {
  // eslint-disable-next-line no-var
  var __aerosettle_db: AeroSettleDatabaseState | undefined;
}

function computeAuditHash(
  prevHash: string,
  action: string,
  entityId: string,
  summary: string
): string {
  return crypto
    .createHash("sha256")
    .update(`${prevHash}|${action}|${entityId}|${summary}`)
    .digest("hex")
    .slice(0, 32)
    .toUpperCase();
}

export function createInitialSeedDatabase(): AeroSettleDatabaseState {
  const companyId = "comp_atlas_global_01";

  const company: CompanyRecord = {
    id: companyId,
    legalName: "Atlas Global Airways Corporation",
    tradingName: "Atlas Global Airways (DEMO DATA)",
    icaoCode: "AGA",
    iataCode: "AG",
    registrationNumber: "US-DE-8849201-AV",
    taxId: "13-4920817",
    countryCode: "US",
    headquartersCity: "New York, NY",
    primaryHubAirport: "KJFK",
    category: "COMMERCIAL_AIRLINE",
    baseCurrency: "USD",
    verificationStatus: "VERIFIED",
    dualControlThresholdUsd: "50000.00",
    requireDualApprovalOnXrpl: true,
    sanctionsScreeningProvider: "AeroCompliance OFAC/EU/UN Real-Time Adapter",
    createdAt: "2026-01-15T09:00:00Z",
  };

  const users: UserRecord[] = [
    {
      id: "usr_cfo_01",
      email: "v.vance@atlasglobalair.demo",
      fullName: "Victoria Vance",
      title: "Chief Financial Officer (SVP Finance)",
      role: "ADMINISTRATOR",
      department: "Executive Aviation Finance",
      mfaEnabled: true,
      mfaMethod: "FIDO2_YUBIKEY_HARDWARE",
      lastLoginAt: "2026-11-05T18:10:00Z",
    },
    {
      id: "usr_fm_02",
      email: "m.sterling@atlasglobalair.demo",
      fullName: "Marcus Sterling",
      title: "VP Global Fleet Treasury & FX",
      role: "FINANCE_MANAGER",
      department: "Global Treasury & Liquidity",
      mfaEnabled: true,
      mfaMethod: "FIDO2_YUBIKEY_HARDWARE",
      lastLoginAt: "2026-11-05T17:42:00Z",
    },
    {
      id: "usr_ap_03",
      email: "e.rostova@atlasglobalair.demo",
      fullName: "Elena Rostova",
      title: "Director of International Settlement",
      role: "PAYMENT_APPROVER",
      department: "Settlement & Counterparty Control",
      mfaEnabled: true,
      mfaMethod: "TOTP_AUTHENTICATOR",
      lastLoginAt: "2026-11-05T16:55:00Z",
    },
    {
      id: "usr_op_04",
      email: "d.chen@atlasglobalair.demo",
      fullName: "David Chen",
      title: "Senior Fuel & MRO Settlement Analyst",
      role: "FINANCE_OPERATOR",
      department: "Accounts Payable & Uplift Ops",
      mfaEnabled: true,
      mfaMethod: "TOTP_AUTHENTICATOR",
      lastLoginAt: "2026-11-05T18:20:00Z",
    },
    {
      id: "usr_au_05",
      email: "h.lindqvist@kpmg-aviation-audit.demo",
      fullName: "Henrik Lindqvist",
      title: "Lead External Aviation Controls Auditor",
      role: "READ_ONLY_AUDITOR",
      department: "External Audit & SOX Compliance",
      mfaEnabled: true,
      mfaMethod: "FIDO2_YUBIKEY_HARDWARE",
      lastLoginAt: "2026-11-04T14:15:00Z",
    },
  ];

  const rolePermissions: RolePermissionRecord[] = [
    {
      role: "ADMINISTRATOR",
      label: "Administrator (Executive / CFO)",
      description:
        "Full platform governance, RBAC configuration, KMS wallet policy management, and unlimited settlement authorization.",
      canCreatePayment: true,
      canApprovePayment: true,
      canExecuteXrpl: true,
      canManageSuppliers: true,
      canCreateInvoice: true,
      canManageTreasury: true,
      canManageUsers: true,
      canExportAuditLogs: true,
      maxSingleApprovalUsd: "10000000.00",
    },
    {
      role: "FINANCE_MANAGER",
      label: "Finance Manager (VP Treasury)",
      description:
        "Manages multi-currency exposures, creates and approves high-value supplier settlements up to $2.5M, and oversees supplier KYB.",
      canCreatePayment: true,
      canApprovePayment: true,
      canExecuteXrpl: true,
      canManageSuppliers: true,
      canCreateInvoice: true,
      canManageTreasury: true,
      canManageUsers: false,
      canExportAuditLogs: true,
      maxSingleApprovalUsd: "2500000.00",
    },
    {
      role: "PAYMENT_APPROVER",
      label: "Payment Approver (Settlement Director)",
      description:
        "Reviews queued payments, verifies invoice 3-way match, signs dual-control approvals, and releases XRPL/SWIFT disbursements.",
      canCreatePayment: false,
      canApprovePayment: true,
      canExecuteXrpl: true,
      canManageSuppliers: false,
      canCreateInvoice: false,
      canManageTreasury: false,
      canManageUsers: false,
      canExportAuditLogs: true,
      maxSingleApprovalUsd: "1000000.00",
    },
    {
      role: "FINANCE_OPERATOR",
      label: "Finance Operator (AP & Fuel Analyst)",
      description:
        "Drafts supplier payments, uploads MRO/fuel invoices, reconciles line items, and submits payments for approval.",
      canCreatePayment: true,
      canApprovePayment: false,
      canExecuteXrpl: false,
      canManageSuppliers: true,
      canCreateInvoice: true,
      canManageTreasury: false,
      canManageUsers: false,
      canExportAuditLogs: false,
      maxSingleApprovalUsd: "0.00",
    },
    {
      role: "READ_ONLY_AUDITOR",
      label: "Read-Only Auditor (Compliance & External Audit)",
      description:
        "Strict read-only inspection of transaction history, XRPL cryptographic proofs, invoice matching, and CSV/Audit exports.",
      canCreatePayment: false,
      canApprovePayment: false,
      canExecuteXrpl: false,
      canManageSuppliers: false,
      canCreateInvoice: false,
      canManageTreasury: false,
      canManageUsers: false,
      canExportAuditLogs: true,
      maxSingleApprovalUsd: "0.00",
    },
  ];

  const beneficiaries: BeneficiaryRecord[] = [
    {
      id: "ben_dubai_fuel_01",
      companyId,
      legalName: "Emirates National Aviation Fuel PJSC",
      tradingName: "GulfJet Into-Plane Fuel Services Dubai",
      countryCode: "AE",
      countryName: "United Arab Emirates",
      city: "Dubai",
      airportIcao: "OMDB",
      category: "FUEL_SUPPLIER",
      defaultCurrency: "AED",
      ibanOrAccount: "AE070331234567890123456",
      swiftBic: "EBILAEADXXX",
      bankName: "Emirates NBD Corporate Aviation Desk",
      xrplDestinationAddr: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      xrplDestinationTag: 971001,
      supportedRails: ["XRPL_BRIDGE", "RLUSD_STABLECOIN", "SWIFT_GPI"],
      contactName: "Tariq Al-Mansoor",
      contactEmail: "settlements@gulfjetfuel-dxb.demo",
      contactPhone: "+971 4 216 8800",
      verificationStatus: "VERIFIED",
      sanctionsStatus: "CLEARED",
      lastScreenedAt: "2026-11-05T06:00:00Z",
      supplierProfile: {
        iataFuelCode: "DXB-GJF-INTOPLANE-01",
        groundHandlingStations: ["OMDB", "OMDW", "OMAA"],
        paymentTermsDays: 14,
        preferredSettlementRail: "XRPL_BRIDGE",
        lifetimeVolumeUsd: "4285000.00",
        averageSettlementSec: 17,
        reliabilityScore: "99.85",
      },
      createdAt: "2026-02-01T10:00:00Z",
    },
    {
      id: "ben_germany_mro_02",
      companyId,
      legalName: "RheinMain AeroEngine & Airframe MRO GmbH",
      tradingName: "RheinMain Technik MRO Frankfurt",
      countryCode: "DE",
      countryName: "Germany",
      city: "Frankfurt am Main",
      airportIcao: "EDDF",
      category: "MRO_FACILITY",
      defaultCurrency: "EUR",
      ibanOrAccount: "DE89370400440532013000",
      swiftBic: "COBADEFFXXX",
      bankName: "Commerzbank AG Corporate Aviation",
      xrplDestinationAddr: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
      xrplDestinationTag: 49069,
      supportedRails: ["XRPL_BRIDGE", "RLUSD_STABLECOIN", "SEPA_INSTANT", "SWIFT_GPI"],
      contactName: "Dr. Klaus Vetter",
      contactEmail: "billing@rheinmain-mro-fra.demo",
      contactPhone: "+49 69 690 72100",
      verificationStatus: "VERIFIED",
      sanctionsStatus: "CLEARED",
      lastScreenedAt: "2026-11-05T06:00:00Z",
      supplierProfile: {
        faaEasaCertNumber: "EASA.145.0419 / FAA-Y83Y412N",
        groundHandlingStations: ["EDDF", "EDDM"],
        paymentTermsDays: 30,
        preferredSettlementRail: "XRPL_BRIDGE",
        lifetimeVolumeUsd: "6190000.00",
        averageSettlementSec: 12,
        reliabilityScore: "99.92",
      },
      createdAt: "2026-02-10T11:30:00Z",
    },
    {
      id: "ben_singapore_parts_03",
      companyId,
      legalName: "Changi AeroRotables & Avionics Distribution Pte. Ltd.",
      tradingName: "Changi AeroParts Singapore",
      countryCode: "SG",
      countryName: "Singapore",
      city: "Singapore",
      airportIcao: "WSSS",
      category: "PARTS_DISTRIBUTOR",
      defaultCurrency: "SGD",
      ibanOrAccount: "SG56DBSS001234567890",
      swiftBic: "DBSSSGSGXXX",
      bankName: "DBS Bank Institutional Aviation",
      xrplDestinationAddr: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
      xrplDestinationTag: 65081,
      supportedRails: ["XRPL_BRIDGE", "RLUSD_STABLECOIN", "SWIFT_GPI"],
      contactName: "Mei Lin Tan",
      contactEmail: "aog-treasury@changiaeroparts-sg.demo",
      contactPhone: "+65 6542 9910",
      verificationStatus: "VERIFIED",
      sanctionsStatus: "CLEARED",
      lastScreenedAt: "2026-11-05T06:00:00Z",
      supplierProfile: {
        faaEasaCertNumber: "CAAS-AWI-088 / AS9120B",
        groundHandlingStations: ["WSSS", "WSSL"],
        paymentTermsDays: 15,
        preferredSettlementRail: "XRPL_BRIDGE",
        lifetimeVolumeUsd: "2840000.00",
        averageSettlementSec: 14,
        reliabilityScore: "99.70",
      },
      createdAt: "2026-02-18T08:15:00Z",
    },
    {
      id: "ben_brazil_ground_04",
      companyId,
      legalName: "Guarulhos AeroPortos Ground Handling & Ramp S.A.",
      tradingName: "AeroSul Ground Handling Brazil",
      countryCode: "BR",
      countryName: "Brazil",
      city: "São Paulo",
      airportIcao: "SBGR",
      category: "GROUND_HANDLING",
      defaultCurrency: "BRL",
      ibanOrAccount: "BR1800360305000010009795493C1",
      swiftBic: "ITAUBRSPXXX",
      bankName: "Itaú Unibanco S.A. Corporate eFX",
      xrplDestinationAddr: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",
      xrplDestinationTag: 55011,
      supportedRails: ["XRPL_BRIDGE", "SWIFT_GPI"],
      contactName: "Rafael Oliveira",
      contactEmail: "financeiro@aerosul-gru.demo",
      contactPhone: "+55 11 2445 5000",
      verificationStatus: "VERIFIED",
      sanctionsStatus: "CLEARED",
      lastScreenedAt: "2026-11-05T06:00:00Z",
      supplierProfile: {
        groundHandlingStations: ["SBGR", "SBGL", "SBKP"],
        paymentTermsDays: 21,
        preferredSettlementRail: "XRPL_BRIDGE",
        lifetimeVolumeUsd: "1195000.00",
        averageSettlementSec: 25,
        reliabilityScore: "98.90",
      },
      createdAt: "2026-03-04T14:00:00Z",
    },
    {
      id: "ben_uk_leasing_05",
      companyId,
      legalName: "Thames Sovereign Widebody Aviation Leasing plc",
      tradingName: "Thames AeroLease London",
      countryCode: "GB",
      countryName: "United Kingdom",
      city: "London",
      airportIcao: "EGLL",
      category: "AIRCRAFT_LEASING",
      defaultCurrency: "GBP",
      ibanOrAccount: "GB29NWBK60161331926819",
      swiftBic: "BARCGB22XXX",
      bankName: "Barclays Corporate Aviation Leasing",
      xrplDestinationAddr: "rLHzPsX6oXkzU2qL12kHCH8G8cnZv1rBJh",
      xrplDestinationTag: 44020,
      supportedRails: ["XRPL_BRIDGE", "RLUSD_STABLECOIN", "SWIFT_GPI"],
      contactName: "Alistair Finch",
      contactEmail: "lease-collections@thamesaerolease.demo",
      contactPhone: "+44 20 7946 0192",
      verificationStatus: "VERIFIED",
      sanctionsStatus: "CLEARED",
      lastScreenedAt: "2026-11-05T06:00:00Z",
      supplierProfile: {
        groundHandlingStations: ["EGLL", "EGKK"],
        paymentTermsDays: 30,
        preferredSettlementRail: "RLUSD_STABLECOIN",
        lifetimeVolumeUsd: "8450000.00",
        averageSettlementSec: 11,
        reliabilityScore: "99.95",
      },
      createdAt: "2026-03-19T09:00:00Z",
    },
    {
      id: "ben_kazakhstan_tech_06",
      companyId,
      legalName: "Almaty Polar Cargo Tech-Stop Services LLP",
      tradingName: "Eurasia TechStop Almaty",
      countryCode: "KZ",
      countryName: "Kazakhstan",
      city: "Almaty",
      airportIcao: "UAAA",
      category: "AIRPORT_AUTHORITY",
      defaultCurrency: "USD",
      ibanOrAccount: "KZ86125KZT5004100100",
      swiftBic: "HSBKKZKX",
      bankName: "Halyk Bank Corporate",
      supportedRails: ["SWIFT_GPI"],
      contactName: "Timur Nazarbayev",
      contactEmail: "ops-billing@eurasiatechstop-ala.demo",
      contactPhone: "+7 727 270 3000",
      verificationStatus: "PENDING_KYB",
      sanctionsStatus: "FLAGGED_MANUAL_REVIEW",
      lastScreenedAt: "2026-11-04T19:00:00Z",
      supplierProfile: {
        groundHandlingStations: ["UAAA"],
        paymentTermsDays: 10,
        preferredSettlementRail: "SWIFT_GPI",
        lifetimeVolumeUsd: "142000.00",
        averageSettlementSec: 172800,
        reliabilityScore: "94.20",
      },
      createdAt: "2026-10-12T12:00:00Z",
    },
  ];

  const invoices: InvoiceRecord[] = [
    {
      id: "inv_dxb_fuel_101",
      companyId,
      beneficiaryId: "ben_dubai_fuel_01",
      beneficiaryName: "GulfJet Into-Plane Fuel Services Dubai",
      beneficiaryCategory: "FUEL_SUPPLIER",
      beneficiaryCountry: "United Arab Emirates",
      invoiceNumber: "INV-DXB-2026-8841",
      direction: "PAYABLE",
      currency: "AED",
      subtotalAmount: "520000.00",
      taxAmount: "26000.00",
      totalAmount: "546000.00",
      usdEquivalent: "148672.57",
      issueDate: "2026-10-28",
      dueDate: "2026-11-11",
      status: "OUTSTANDING",
      aircraftTailNumber: "N789AS (Boeing 777-300ER)",
      flightNumber: "AG-402 (KJFK-OMDB)",
      airportIcao: "OMDB",
      documentFileName: "GulfJet_Uplift_Ticket_OMDB_8841.pdf",
      documentHashSha256:
        "9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08",
      notes:
        "Jet A-1 Hydrant Uplift (148,000 Liters) + Into-plane defueling/refueling hookup fee at Gate C14 Dubai Int'l.",
      lineItems: [
        {
          id: "li_101_1",
          description: "Jet A-1 Aviation Turbine Fuel Uplift (Platts Gulf Index)",
          skuOrPartNum: "JETA1-OMDB-HYD",
          quantity: "160000",
          unit: "LITERS",
          unitPrice: "3.200000",
          lineTotal: "512000.00",
        },
        {
          id: "li_101_2",
          description: "Into-Plane Hydrant Dispenser Vehicle & Safety Supervision",
          skuOrPartNum: "HYD-DISP-WIDEBODY",
          quantity: "2",
          unit: "UPLIFTS",
          unitPrice: "4000.000000",
          lineTotal: "8000.00",
        },
      ],
      createdAt: "2026-10-28T14:20:00Z",
    },
    {
      id: "inv_fra_mro_102",
      companyId,
      beneficiaryId: "ben_germany_mro_02",
      beneficiaryName: "RheinMain Technik MRO Frankfurt",
      beneficiaryCategory: "MRO_FACILITY",
      beneficiaryCountry: "Germany",
      invoiceNumber: "INV-FRA-2026-4419",
      direction: "PAYABLE",
      currency: "EUR",
      subtotalAmount: "210000.00",
      taxAmount: "0.00", // Cross-border international air carrier VAT zero-rated
      totalAmount: "210000.00",
      usdEquivalent: "227149.81",
      issueDate: "2026-10-15",
      dueDate: "2026-11-14",
      status: "OUTSTANDING",
      aircraftTailNumber: "N892AS (Airbus A350-900)",
      flightNumber: "AG-118 (KJFK-EDDF)",
      airportIcao: "EDDF",
      documentFileName: "RheinMain_EASA_Form1_C_Check_4419.pdf",
      documentHashSha256:
        "4B227777D4DD1FC61C6F884F48641D02B4D121D3FD328CB08B5531FCACDABF8A",
      notes:
        "Scheduled 6-Year Airframe C-Check Milestone #2 + Trent XWB Borescope Inspection at Hangar 7 Frankfurt.",
      lineItems: [
        {
          id: "li_102_1",
          description: "Airbus A350-900 Heavy Airframe C-Check Labor (EASA Part-145)",
          skuOrPartNum: "MRO-A359-CCHK",
          quantity: "1200",
          unit: "MAN-HOURS",
          unitPrice: "145.000000",
          lineTotal: "174000.00",
        },
        {
          id: "li_102_2",
          description: "Rolls-Royce Trent XWB Dual-Engine Full Borescope & NDT",
          skuOrPartNum: "ENG-TXWB-BSI",
          quantity: "2",
          unit: "ENGINES",
          unitPrice: "18000.000000",
          lineTotal: "36000.00",
        },
      ],
      createdAt: "2026-10-15T09:30:00Z",
    },
    {
      id: "inv_sin_parts_103",
      companyId,
      beneficiaryId: "ben_singapore_parts_03",
      beneficiaryName: "Changi AeroParts Singapore",
      beneficiaryCategory: "PARTS_DISTRIBUTOR",
      beneficiaryCountry: "Singapore",
      invoiceNumber: "INV-SIN-2026-AOG92",
      direction: "PAYABLE",
      currency: "SGD",
      subtotalAmount: "92000.00",
      taxAmount: "0.00",
      totalAmount: "92000.00",
      usdEquivalent: "68605.52",
      issueDate: "2026-10-10",
      dueDate: "2026-10-25",
      status: "OVERDUE",
      aircraftTailNumber: "N410AS (Boeing 787-9 Dreamliner)",
      flightNumber: "AG-881 (KLAX-WSSS)",
      airportIcao: "WSSS",
      documentFileName: "Changi_AOG_IDG_Actuator_Release_92.pdf",
      documentHashSha256:
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
      notes:
        "URGENT AOG Dispatch: Honeywell Integrated Drive Generator (IDG) + Nose Landing Gear Steering Actuator with FAA 8130-3 Dual Release Tag.",
      lineItems: [
        {
          id: "li_103_1",
          description: "B787 Variable Frequency Starter Generator (VFSG) Overhauled Unit",
          skuOrPartNum: "PN-787-VFSG-902A",
          quantity: "1",
          unit: "EA",
          unitPrice: "68000.000000",
          lineTotal: "68000.00",
        },
        {
          id: "li_103_2",
          description: "Nose Gear Electro-Hydrostatic Steering Actuator (AOG Priority)",
          skuOrPartNum: "PN-NLG-EHSA-411",
          quantity: "1",
          unit: "EA",
          unitPrice: "24000.000000",
          lineTotal: "24000.00",
        },
      ],
      createdAt: "2026-10-10T04:12:00Z",
    },
    {
      id: "inv_gru_gh_104",
      companyId,
      beneficiaryId: "ben_brazil_ground_04",
      beneficiaryName: "AeroSul Ground Handling Brazil",
      beneficiaryCategory: "GROUND_HANDLING",
      beneficiaryCountry: "Brazil",
      invoiceNumber: "INV-GRU-2026-3091",
      direction: "PAYABLE",
      currency: "BRL",
      subtotalAmount: "265000.00",
      taxAmount: "13250.00",
      totalAmount: "278250.00",
      usdEquivalent: "48106.85",
      issueDate: "2026-11-01",
      dueDate: "2026-11-22",
      status: "PENDING_APPROVAL",
      aircraftTailNumber: "N504AS (Boeing 777-200LR)",
      flightNumber: "AG-705 (KMIA-SBGR)",
      airportIcao: "SBGR",
      documentFileName: "AeroSul_SBGR_Turnaround_Oct2026.pdf",
      documentHashSha256:
        "7D865E959B2466918C9863AFCA942D0FB89D7C9AC0C99BADC3749504DED97730",
      notes:
        "October 2026 Widebody Turnaround Package (15 Turnarounds at SBGR Terminal 3): Ramp Pushback, ULD Cargo Loader, GPU & Cabin Galley Catering.",
      lineItems: [
        {
          id: "li_104_1",
          description: "Widebody Full Ramp Handling & ULD Cargo Loading Turnaround",
          skuOrPartNum: "GH-SBGR-WB-TURN",
          quantity: "15",
          unit: "TURNAROUNDS",
          unitPrice: "15000.000000",
          lineTotal: "225000.00",
        },
        {
          id: "li_104_2",
          description: "400Hz Ground Power Unit (GPU) & Pre-Conditioned Air (PCA)",
          skuOrPartNum: "GH-SBGR-GPU-PCA",
          quantity: "40",
          unit: "HOURS",
          unitPrice: "1000.000000",
          lineTotal: "40000.00",
        },
      ],
      createdAt: "2026-11-01T16:40:00Z",
    },
    {
      id: "inv_dxb_fuel_paid_100",
      companyId,
      beneficiaryId: "ben_dubai_fuel_01",
      beneficiaryName: "GulfJet Into-Plane Fuel Services Dubai",
      beneficiaryCategory: "FUEL_SUPPLIER",
      beneficiaryCountry: "United Arab Emirates",
      invoiceNumber: "INV-DXB-2026-8510",
      direction: "PAYABLE",
      currency: "AED",
      subtotalAmount: "650000.00",
      taxAmount: "32500.00",
      totalAmount: "682500.00",
      usdEquivalent: "185840.71",
      issueDate: "2026-10-14",
      dueDate: "2026-10-28",
      status: "PAID",
      aircraftTailNumber: "N789AS (Boeing 777-300ER)",
      flightNumber: "AG-402 (KJFK-OMDB)",
      airportIcao: "OMDB",
      documentFileName: "GulfJet_Uplift_Ticket_OMDB_8510.pdf",
      documentHashSha256:
        "3A7BD3E2360A3D29EEA436FCFB7E44C735D117C42D1C1835420B6B9942DD4F1B",
      matchedPaymentId: "pay_hist_01",
      notes: "Settled via XRPL Bridge to UAEFTS in 17 seconds.",
      lineItems: [
        {
          id: "li_100_1",
          description: "Jet A-1 Fuel Uplift OMDB Concourse B (203,125 Liters)",
          skuOrPartNum: "JETA1-OMDB-HYD",
          quantity: "203125",
          unit: "LITERS",
          unitPrice: "3.200000",
          lineTotal: "650000.00",
        },
      ],
      createdAt: "2026-10-14T11:00:00Z",
    },
  ];

  // Historical and active payments covering all statuses and execution classifications
  const xrplRec1 = buildXrplSettlementRecord({
    walletId: "wal_xrpl_primary_01",
    network: "SIMULATION_SANDBOX",
    sourceAddress: "rAtlasGlobalTreasury9921XRPkL8mN2",
    destinationAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    destinationTag: 971001,
    xrpAmountDecimal: "75853.351020",
    deliveredCurrency: "AED",
    deliveredValue: "682500.00",
    paymentReference: "PAY-2026-90411",
    invoiceNumber: "INV-DXB-2026-8510",
    aircraftTailNumber: "N789AS",
    airportIcao: "OMDB",
  });
  xrplRec1.id = "xrpl_rec_seed_01";
  xrplRec1.createdAt = "2026-10-26T14:22:10Z";

  const xrplRec2 = buildXrplSettlementRecord({
    walletId: "wal_xrpl_primary_01",
    network: "SIMULATION_SANDBOX",
    sourceAddress: "rAtlasGlobalTreasury9921XRPkL8mN2",
    destinationAddress: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    destinationTag: 49069,
    xrpAmountDecimal: "128540.122449",
    deliveredCurrency: "EUR",
    deliveredValue: "291000.00",
    paymentReference: "PAY-2026-90388",
    invoiceNumber: "INV-FRA-2026-4102",
    aircraftTailNumber: "N892AS",
    airportIcao: "EDDF",
  });
  xrplRec2.id = "xrpl_rec_seed_02";
  xrplRec2.createdAt = "2026-10-21T09:14:05Z";

  const xrplRec3 = buildXrplSettlementRecord({
    walletId: "wal_xrpl_primary_01",
    network: "SIMULATION_SANDBOX",
    sourceAddress: "rAtlasGlobalTreasury9921XRPkL8mN2",
    destinationAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
    destinationTag: 65081,
    xrpAmountDecimal: "44210.612245",
    deliveredCurrency: "SGD",
    deliveredValue: "145200.00",
    paymentReference: "PAY-2026-90342",
    invoiceNumber: "INV-SIN-2026-AOG77",
    aircraftTailNumber: "N410AS",
    airportIcao: "WSSS",
  });
  xrplRec3.id = "xrpl_rec_seed_03";
  xrplRec3.createdAt = "2026-10-16T03:45:22Z";

  const payments: PaymentRecord[] = [
    {
      id: "pay_hist_01",
      paymentReference: "PAY-2026-90411",
      companyId,
      beneficiaryId: "ben_dubai_fuel_01",
      beneficiaryName: "GulfJet Into-Plane Fuel Services Dubai",
      beneficiaryCountry: "United Arab Emirates",
      beneficiaryCategory: "FUEL_SUPPLIER",
      initiatorUserId: "usr_fm_02",
      initiatorName: "Marcus Sterling",
      invoiceId: "inv_dxb_fuel_paid_100",
      invoiceNumber: "INV-DXB-2026-8510",
      sourceCurrency: "USD",
      sourceAmount: "185840.71",
      destinationCurrency: "AED",
      destinationAmount: "682500.00",
      usdEquivalent: "185840.71",
      exchangeRate: "3.672500",
      totalFeeUsd: "15.01",
      settlementRail: "XRPL_BRIDGE",
      status: "COMPLETED",
      executionClassification: "SIMULATED_PAYMENT",
      purposeCode: "JET_A1_UPLIFT",
      aircraftTailNumber: "N789AS",
      airportIcao: "OMDB",
      memoText: "Oct 14 OMDB Widebody Uplift Settlement via XRPL Bridge -> UAEFTS",
      requiresDualApproval: true,
      requiredApprovalsCount: 2,
      approvals: [
        {
          id: "app_01",
          paymentId: "pay_hist_01",
          approverId: "usr_ap_03",
          approverName: "Elena Rostova",
          approverRole: "PAYMENT_APPROVER",
          decision: "APPROVED",
          comment: "Verified OMDB hydrant fuel ticket & Platts index pricing.",
          signature: "SIG-SHA256-8F41C920B1",
          decidedAt: "2026-10-26T14:20:00Z",
        },
        {
          id: "app_02",
          paymentId: "pay_hist_01",
          approverId: "usr_cfo_01",
          approverName: "Victoria Vance",
          approverRole: "ADMINISTRATOR",
          decision: "APPROVED",
          comment: "Dual-control CFO release authorized.",
          signature: "SIG-SHA256-3E99A104D2",
          decidedAt: "2026-10-26T14:21:55Z",
        },
      ],
      xrplRecord: xrplRec1,
      externalBankRef: "UAEFTS-20261026-994012",
      settlementDurationSec: 17,
      submittedAt: "2026-10-26T14:22:00Z",
      completedAt: "2026-10-26T14:22:17Z",
      createdAt: "2026-10-26T14:10:00Z",
    },
    {
      id: "pay_hist_02",
      paymentReference: "PAY-2026-90388",
      companyId,
      beneficiaryId: "ben_germany_mro_02",
      beneficiaryName: "RheinMain Technik MRO Frankfurt",
      beneficiaryCountry: "Germany",
      beneficiaryCategory: "MRO_FACILITY",
      initiatorUserId: "usr_fm_02",
      initiatorName: "Marcus Sterling",
      invoiceNumber: "INV-FRA-2026-4102",
      sourceCurrency: "USD",
      sourceAmount: "314916.20",
      destinationCurrency: "EUR",
      destinationAmount: "291000.00",
      usdEquivalent: "314916.20",
      exchangeRate: "0.924055",
      totalFeeUsd: "12.01",
      settlementRail: "XRPL_BRIDGE",
      status: "COMPLETED",
      executionClassification: "SIMULATED_PAYMENT",
      purposeCode: "MRO_C_CHECK_MILESTONE",
      aircraftTailNumber: "N892AS",
      airportIcao: "EDDF",
      memoText: "A350-900 Hangar 7 Overhaul Milestone #1 via XRPL -> SEPA Instant",
      requiresDualApproval: true,
      requiredApprovalsCount: 2,
      approvals: [
        {
          id: "app_03",
          paymentId: "pay_hist_02",
          approverId: "usr_ap_03",
          approverName: "Elena Rostova",
          approverRole: "PAYMENT_APPROVER",
          decision: "APPROVED",
          comment: "EASA Form 1 sign-off confirmed.",
          signature: "SIG-SHA256-77C2019FA4",
          decidedAt: "2026-10-21T09:12:00Z",
        },
        {
          id: "app_04",
          paymentId: "pay_hist_02",
          approverId: "usr_cfo_01",
          approverName: "Victoria Vance",
          approverRole: "ADMINISTRATOR",
          decision: "APPROVED",
          comment: "Approved for immediate XRPL EUR bridge.",
          signature: "SIG-SHA256-1B4480E2C1",
          decidedAt: "2026-10-21T09:13:50Z",
        },
      ],
      xrplRecord: xrplRec2,
      externalBankRef: "SEPA-INST-DE89-4401928",
      settlementDurationSec: 12,
      submittedAt: "2026-10-21T09:14:00Z",
      completedAt: "2026-10-21T09:14:12Z",
      createdAt: "2026-10-21T08:50:00Z",
    },
    {
      id: "pay_hist_03",
      paymentReference: "PAY-2026-90342",
      companyId,
      beneficiaryId: "ben_singapore_parts_03",
      beneficiaryName: "Changi AeroParts Singapore",
      beneficiaryCountry: "Singapore",
      beneficiaryCategory: "PARTS_DISTRIBUTOR",
      initiatorUserId: "usr_op_04",
      initiatorName: "David Chen",
      invoiceNumber: "INV-SIN-2026-AOG77",
      sourceCurrency: "USD",
      sourceAmount: "108315.49",
      destinationCurrency: "SGD",
      destinationAmount: "145200.00",
      usdEquivalent: "108315.49",
      exchangeRate: "1.340528",
      totalFeeUsd: "12.01",
      settlementRail: "XRPL_BRIDGE",
      status: "COMPLETED",
      executionClassification: "SIMULATED_PAYMENT",
      purposeCode: "AOG_ROTABLE_PARTS",
      aircraftTailNumber: "N410AS",
      airportIcao: "WSSS",
      memoText: "Emergency AOG Avionics Bay Line Replaceable Unit release at Changi",
      requiresDualApproval: true,
      requiredApprovalsCount: 2,
      approvals: [
        {
          id: "app_05",
          paymentId: "pay_hist_03",
          approverId: "usr_ap_03",
          approverName: "Elena Rostova",
          approverRole: "PAYMENT_APPROVER",
          decision: "APPROVED",
          comment: "AOG priority release verified with Maintenance Control.",
          signature: "SIG-SHA256-91D4882E10",
          decidedAt: "2026-10-16T03:44:00Z",
        },
        {
          id: "app_06",
          paymentId: "pay_hist_03",
          approverId: "usr_fm_02",
          approverName: "Marcus Sterling",
          approverRole: "FINANCE_MANAGER",
          decision: "APPROVED",
          comment: "Approved overnight AOG release.",
          signature: "SIG-SHA256-5C00291FA8",
          decidedAt: "2026-10-16T03:45:10Z",
        },
      ],
      xrplRecord: xrplRec3,
      externalBankRef: "FAST-SG-20261016-88210",
      settlementDurationSec: 14,
      submittedAt: "2026-10-16T03:45:15Z",
      completedAt: "2026-10-16T03:45:29Z",
      createdAt: "2026-10-16T03:30:00Z",
    },
    {
      id: "pay_hist_04",
      paymentReference: "PAY-2026-90450",
      companyId,
      beneficiaryId: "ben_uk_leasing_05",
      beneficiaryName: "Thames AeroLease London",
      beneficiaryCountry: "United Kingdom",
      beneficiaryCategory: "AIRCRAFT_LEASING",
      initiatorUserId: "usr_fm_02",
      initiatorName: "Marcus Sterling",
      invoiceNumber: "INV-LHR-2026-LEASE11",
      sourceCurrency: "USD",
      sourceAmount: "425000.00",
      destinationCurrency: "GBP",
      destinationAmount: "335035.00",
      usdEquivalent: "425000.00",
      exchangeRate: "0.788318",
      totalFeeUsd: "12.01",
      settlementRail: "RLUSD_STABLECOIN",
      status: "COMPLETED",
      executionClassification: "COMPLETED_EXTERNAL_FIAT_SETTLEMENT",
      purposeCode: "AIRCRAFT_DRY_LEASE_MONTHLY",
      aircraftTailNumber: "N789AS",
      airportIcao: "EGLL",
      memoText: "November 2026 B777-300ER MSN-41920 Monthly Dry Lease Rental",
      requiresDualApproval: true,
      requiredApprovalsCount: 2,
      approvals: [
        {
          id: "app_07",
          paymentId: "pay_hist_04",
          approverId: "usr_ap_03",
          approverName: "Elena Rostova",
          approverRole: "PAYMENT_APPROVER",
          decision: "APPROVED",
          comment: "Lease schedule MSN-41920 verified.",
          signature: "SIG-SHA256-4A9182736C",
          decidedAt: "2026-11-01T10:05:00Z",
        },
        {
          id: "app_08",
          paymentId: "pay_hist_04",
          approverId: "usr_cfo_01",
          approverName: "Victoria Vance",
          approverRole: "ADMINISTRATOR",
          decision: "APPROVED",
          comment: "Authorized RLUSD -> UK FPS settlement.",
          signature: "SIG-SHA256-8B7261549D",
          decidedAt: "2026-11-01T10:12:00Z",
        },
      ],
      externalBankRef: "UKFPS-BARC-20261101-7731",
      settlementDurationSec: 11,
      submittedAt: "2026-11-01T10:12:10Z",
      completedAt: "2026-11-01T10:12:21Z",
      createdAt: "2026-11-01T09:45:00Z",
    },
    {
      id: "pay_queue_05",
      paymentReference: "PAY-2026-90489",
      companyId,
      beneficiaryId: "ben_germany_mro_02",
      beneficiaryName: "RheinMain Technik MRO Frankfurt",
      beneficiaryCountry: "Germany",
      beneficiaryCategory: "MRO_FACILITY",
      initiatorUserId: "usr_op_04",
      initiatorName: "David Chen",
      invoiceId: "inv_fra_mro_102",
      invoiceNumber: "INV-FRA-2026-4419",
      sourceCurrency: "USD",
      sourceAmount: "227149.81",
      destinationCurrency: "EUR",
      destinationAmount: "210000.00",
      usdEquivalent: "227149.81",
      exchangeRate: "0.924500",
      totalFeeUsd: "12.01",
      settlementRail: "XRPL_BRIDGE",
      status: "AWAITING_APPROVAL",
      executionClassification: "SIMULATED_PAYMENT",
      purposeCode: "MRO_C_CHECK_MILESTONE",
      aircraftTailNumber: "N892AS (Airbus A350-900)",
      airportIcao: "EDDF",
      memoText:
        "Awaiting dual-control approval: A350-900 C-Check Milestone #2 & Trent XWB Borescope (INV-FRA-2026-4419)",
      requiresDualApproval: true,
      requiredApprovalsCount: 1,
      approvals: [],
      createdAt: "2026-11-05T14:30:00Z",
    },
    {
      id: "pay_pending_06",
      paymentReference: "PAY-2026-90492",
      companyId,
      beneficiaryId: "ben_brazil_ground_04",
      beneficiaryName: "AeroSul Ground Handling Brazil",
      beneficiaryCountry: "Brazil",
      beneficiaryCategory: "GROUND_HANDLING",
      initiatorUserId: "usr_fm_02",
      initiatorName: "Marcus Sterling",
      invoiceId: "inv_gru_gh_104",
      invoiceNumber: "INV-GRU-2026-3091",
      sourceCurrency: "USD",
      sourceAmount: "48106.85",
      destinationCurrency: "BRL",
      destinationAmount: "278250.00",
      usdEquivalent: "48106.85",
      exchangeRate: "5.784000",
      totalFeeUsd: "22.01",
      settlementRail: "XRPL_BRIDGE",
      status: "PENDING_SETTLEMENT",
      executionClassification: "SUBMITTED_BLOCKCHAIN_TX",
      purposeCode: "GROUND_HANDLING_RAMP",
      aircraftTailNumber: "N504AS (Boeing 777-200LR)",
      airportIcao: "SBGR",
      memoText:
        "XRPL leg submitted; awaiting BACEN eFX partner PIX disbursement confirmation at SBGR",
      requiresDualApproval: false,
      requiredApprovalsCount: 1,
      approvals: [
        {
          id: "app_09",
          paymentId: "pay_pending_06",
          approverId: "usr_ap_03",
          approverName: "Elena Rostova",
          approverRole: "PAYMENT_APPROVER",
          decision: "APPROVED",
          comment: "Approved SBGR October turnaround settlement.",
          signature: "SIG-SHA256-6D1092834A",
          decidedAt: "2026-11-05T17:50:00Z",
        },
      ],
      submittedAt: "2026-11-05T17:51:00Z",
      createdAt: "2026-11-05T17:15:00Z",
    },
  ];

  const transactions: TransactionLedgerRecord[] = payments
    .filter((p) => p.status === "COMPLETED" || p.status === "PENDING_SETTLEMENT")
    .map((p, idx) => ({
      id: `tx_led_${idx + 1}`,
      transactionReference: `TXN-AS-${p.paymentReference.replace("PAY-", "")}`,
      paymentId: p.id,
      paymentReference: p.paymentReference,
      companyId: p.companyId,
      beneficiaryId: p.beneficiaryId,
      senderName: company.legalName,
      recipientName: p.beneficiaryName,
      recipientCountry: p.beneficiaryCountry,
      recipientCategory: p.beneficiaryCategory,
      airportIcao: p.airportIcao || "KJFK",
      aircraftTailNumber: p.aircraftTailNumber,
      invoiceNumber: p.invoiceNumber,
      sourceCurrency: p.sourceCurrency,
      sourceAmount: p.sourceAmount,
      destinationCurrency: p.destinationCurrency,
      destinationAmount: p.destinationAmount,
      usdEquivalent: p.usdEquivalent,
      exchangeRate: p.exchangeRate,
      feeAmountUsd: p.totalFeeUsd,
      settlementRail: p.settlementRail,
      status: p.status,
      executionClassification: p.executionClassification,
      settlementDurationSec: p.settlementDurationSec || 24,
      externalBankRef: p.externalBankRef,
      xrplTxHash: p.xrplRecord?.txHash ?? null,
      simulationTraceId: p.xrplRecord?.simulationTraceId ?? null,
      xrplRecord: p.xrplRecord,
      createdAt: p.submittedAt || p.createdAt,
      settledAt: p.completedAt,
    }));

  const treasuryAccounts: TreasuryAccountRecord[] = [
    {
      id: "acc_fiat_usd_01",
      companyId,
      accountCode: "TR-USD-JPM-001",
      accountName: "Primary USD Aviation Operating Treasury",
      currency: "USD",
      assetType: "FIAT_BANK_ACCOUNT",
      custodyType: "EXTERNAL_BANK_LINKED",
      custodyDisclosure:
        "External Bank Balance (Read-Only Open Banking Feed). Funds are held directly at JPMorgan Chase N.A., never custodied by AeroSettle.",
      institutionName: "JPMorgan Chase N.A. — New York Aviation Desk",
      accountIdentifier: "US-JPM-****-8841 (Fedwire / SWIFT CHASUS33)",
      availableBalance: "6420000.00",
      reservedBalance: "275256.66",
      usdEquivalent: "6420000.00",
      lastSyncedAt: "2026-11-05T18:25:00Z",
    },
    {
      id: "acc_fiat_eur_02",
      companyId,
      accountCode: "TR-EUR-DBK-002",
      accountName: "European Hub EUR MRO & Eurocontrol Reserve",
      currency: "EUR",
      assetType: "FIAT_BANK_ACCOUNT",
      custodyType: "EXTERNAL_BANK_LINKED",
      custodyDisclosure:
        "External Bank Balance (Read-Only EBICS/CAMT.053 Feed). Funds held directly at Deutsche Bank AG Frankfurt.",
      institutionName: "Deutsche Bank AG — Frankfurt Corporate Treasury",
      accountIdentifier: "DE44-5007-****-0192 (SEPA Instant RT1)",
      availableBalance: "1850000.00",
      reservedBalance: "210000.00",
      usdEquivalent: "2001081.67",
      lastSyncedAt: "2026-11-05T18:25:00Z",
    },
    {
      id: "acc_fiat_aed_03",
      companyId,
      accountCode: "TR-AED-ENBD-003",
      accountName: "MENA Hub AED Fuel Uplift Clearing Account",
      currency: "AED",
      assetType: "FIAT_BANK_ACCOUNT",
      custodyType: "EXTERNAL_BANK_LINKED",
      custodyDisclosure:
        "External Bank Balance (Read-Only SWIFT MT940 Feed). Funds held at Emirates NBD Dubai.",
      institutionName: "Emirates NBD PJSC — Dubai Aviation Branch",
      accountIdentifier: "AE81-0260-****-4410 (UAEFTS Direct)",
      availableBalance: "2940000.00",
      reservedBalance: "546000.00",
      usdEquivalent: "800544.59",
      lastSyncedAt: "2026-11-05T18:25:00Z",
    },
    {
      id: "acc_xrpl_native_04",
      companyId,
      accountCode: "TR-XRP-KMS-004",
      accountName: "XRPL On-Demand Liquidity Bridge Reserve (Demo/Sim)",
      currency: "XRP",
      assetType: "XRPL_NATIVE_ASSET",
      custodyType: "NON_CUSTODIAL_XRPL_SIGNER",
      custodyDisclosure:
        "Non-Custodial Institutional Signer Reference + Indicative USD Valuation (@ $2.45/XRP). Private keys reside exclusively in customer AWS KMS / Thales HSM.",
      institutionName: "Customer Self-Managed HSM Signer (XRPL Multi-Sig)",
      accountIdentifier: "rAtlasGlobalTreasury9921XRPkL8mN2",
      availableBalance: "1425000.00",
      reservedBalance: "1.40", // 1.0 XRP Base Reserve + 0.4 XRP Owner Reserve
      usdEquivalent: "3491250.00",
      lastSyncedAt: "2026-11-05T18:25:00Z",
    },
    {
      id: "acc_stable_rlusd_05",
      companyId,
      accountCode: "TR-RLUSD-TRUST-005",
      accountName: "RLUSD Regulated USD Settlement Trustline",
      currency: "RLUSD",
      assetType: "REGULATED_STABLECOIN",
      custodyType: "EXTERNAL_CUSTODY_VAULT",
      custodyDisclosure:
        "External Regulated Custodian Vault Balance. Issued 1:1 against USD reserves by licensed trust institution; AeroSettle acts strictly as orchestration software.",
      institutionName: "Standard Custody & Trust Institutional Vault",
      accountIdentifier: "rAtlasGlobalTreasury9921XRPkL8mN2 (Trustline: RLUSD)",
      availableBalance: "1250000.00",
      reservedBalance: "0.00",
      usdEquivalent: "1250000.00",
      lastSyncedAt: "2026-11-05T18:25:00Z",
    },
  ];

  const wallets: WalletReferenceRecord[] = [
    {
      id: "wal_xrpl_primary_01",
      companyId,
      label: "Atlas Global Primary HSM Settlement Signer",
      network: "SIMULATION_SANDBOX",
      classicAddress: "rAtlasGlobalTreasury9921XRPkL8mN2",
      xAddress: "X7AtlasGlobalTreasury9921XRPkL8mN2Qv9B",
      custodyArchitecture:
        "Non-Custodial Customer HSM (2-of-3 Multi-Signers: CFO + VP Treasury + Automated Policy Engine)",
      xrpBalanceDrops: "1425000000000",
      xrpBalanceDecimal: "1425000.000000",
      rlusdBalanceDecimal: "1250000.000000",
      baseReserveXrp: "1.000000",
      ownerReserveXrp: "0.400000",
      sequenceNumber: 840219,
      isSimulated: true,
      lastLedgerIndex: null,
      updatedAt: "2026-11-05T18:25:00Z",
    },
    {
      id: "wal_xrpl_testnet_02",
      companyId,
      label: "Atlas Global XRPL Testnet Integration Wallet",
      network: "XRPL_TESTNET",
      classicAddress: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
      xAddress: "TVd2rqMkYL2AyS97NdELcpeiprNBjwLZzuUG5L",
      custodyArchitecture:
        "Server-Side Environment Signer (Testnet Development Sandbox)",
      xrpBalanceDrops: "25000000000",
      xrpBalanceDecimal: "25000.000000",
      rlusdBalanceDecimal: "50000.000000",
      baseReserveXrp: "1.000000",
      ownerReserveXrp: "0.200000",
      sequenceNumber: 1042,
      isSimulated: true,
      lastLedgerIndex: 4928104,
      updatedAt: "2026-11-05T18:25:00Z",
    },
  ];

  const auditLogs: AuditLogRecord[] = [];
  let prevHash = "GENESIS_AEROSETTLE_AUDIT_CHAIN_0000000000";

  const seedAuditEvents: Array<{
    actorUserId: string;
    actorName: string;
    actorRole: UserRole;
    action: string;
    entityType: AuditLogRecord["entityType"];
    entityId: string;
    summary: string;
    createdAt: string;
  }> = [
    {
      actorUserId: "usr_cfo_01",
      actorName: "Victoria Vance",
      actorRole: "ADMINISTRATOR",
      action: "COMPANY_DUAL_CONTROL_POLICY_ENFORCED",
      entityType: "SETTINGS",
      entityId: companyId,
      summary:
        "Enforced dual-control approval policy for all international settlements >= $50,000.00 USD and all XRPL bridge executions.",
      createdAt: "2026-10-15T09:00:00Z",
    },
    {
      actorUserId: "usr_fm_02",
      actorName: "Marcus Sterling",
      actorRole: "FINANCE_MANAGER",
      action: "XRPL_BRIDGE_SETTLEMENT_COMPLETED",
      entityType: "PAYMENT",
      entityId: "pay_hist_01",
      summary:
        "Executed PAY-2026-90411 (AED 682,500.00 to GulfJet Dubai OMDB) via XRPL Bridge [SIMULATED_PAYMENT: SIM-XRPL]. Matched to INV-DXB-2026-8510.",
      createdAt: "2026-10-26T14:22:17Z",
    },
    {
      actorUserId: "usr_op_04",
      actorName: "David Chen",
      actorRole: "FINANCE_OPERATOR",
      action: "PAYMENT_QUEUED_FOR_APPROVAL",
      entityType: "PAYMENT",
      entityId: "pay_queue_05",
      summary:
        "Submitted PAY-2026-90489 (EUR 210,000.00 to RheinMain Technik MRO Frankfurt EDDF) for dual-control approval against INV-FRA-2026-4419.",
      createdAt: "2026-11-05T14:30:00Z",
    },
  ];

  seedAuditEvents.forEach((ev, idx) => {
    const hash = computeAuditHash(
      prevHash,
      ev.action,
      ev.entityId,
      ev.summary
    );
    prevHash = hash;
    auditLogs.push({
      id: `aud_seed_${idx + 1}`,
      companyId,
      actorUserId: ev.actorUserId,
      actorName: ev.actorName,
      actorRole: ev.actorRole,
      action: ev.action,
      entityType: ev.entityType,
      entityId: ev.entityId,
      ipAddress: "198.51.100.42",
      summary: ev.summary,
      metadataJson: JSON.stringify({ previousChainHash: prevHash, verifiedMfa: true }),
      integrityHash: hash,
      createdAt: ev.createdAt,
    });
  });

  const notifications: NotificationRecord[] = [
    {
      id: "notif_01",
      companyId,
      severity: "ACTION_REQUIRED",
      title: "Approval Required:PAY-2026-90489 (EUR 210,000.00)",
      message:
        "RheinMain Technik MRO Frankfurt C-Check Milestone #2 (A350-900 N892AS) awaits Payment Approver sign-off.",
      linkTab: "payments",
      isRead: false,
      createdAt: "2026-11-05T14:30:05Z",
    },
    {
      id: "notif_02",
      companyId,
      severity: "WARNING",
      title: "Overdue AOG Parts Invoice: INV-SIN-2026-AOG92 (SGD 92,000.00)",
      message:
        "Changi AeroParts Singapore invoice for B787-9 (N410AS) VFSG & Steering Actuator is overdue. Initiate XRPL FAST settlement to clear hold.",
      linkTab: "invoices",
      isRead: false,
      createdAt: "2026-11-04T08:00:00Z",
    },
    {
      id: "notif_03",
      companyId,
      severity: "SUCCESS",
      title: "Dubai Fuel Uplift Settled in 17s (PAY-2026-90411)",
      message:
        "AED 682,500.00 settled to GulfJet Into-Plane Fuel Services (OMDB) and reconciled with INV-DXB-2026-8510.",
      linkTab: "transactions",
      isRead: true,
      createdAt: "2026-10-26T14:22:20Z",
    },
  ];

  return {
    isDemoEnvironment: true,
    activeUserId: "usr_cfo_01",
    xrplNetworkMode: "SIMULATION_SANDBOX",
    company,
    users,
    rolePermissions,
    beneficiaries,
    invoices,
    payments,
    transactions,
    treasuryAccounts,
    wallets,
    auditLogs: auditLogs.reverse(),
    notifications,
  };
}

export function loadDatabase(): AeroSettleDatabaseState {
  if (globalThis.__aerosettle_db) {
    return globalThis.__aerosettle_db;
  }

  // 1. Try reading project file (local development)
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, "utf8");
      const state = JSON.parse(raw) as AeroSettleDatabaseState;
      globalThis.__aerosettle_db = state;
      return state;
    }
  } catch {
    // Continue to next fallback
  }

  // 2. Try reading tmp file (serverless environment like Vercel)
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      const raw = fs.readFileSync(TMP_DB_PATH, "utf8");
      const state = JSON.parse(raw) as AeroSettleDatabaseState;
      globalThis.__aerosettle_db = state;
      return state;
    }
  } catch {
    // Continue
  }

  const initial = createInitialSeedDatabase();
  globalThis.__aerosettle_db = initial;
  saveDatabase(initial);
  return initial;
}

export function saveDatabase(state: AeroSettleDatabaseState): void {
  globalThis.__aerosettle_db = state;
  const jsonStr = JSON.stringify(state, null, 2);

  // 1. Try saving locally in data dir if writable
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, jsonStr, "utf8");
    return;
  } catch {
    // Falls back to writable /tmp on serverless environments like Vercel
  }

  // 2. Write to writable temp directory on Vercel/Lambda
  try {
    fs.writeFileSync(TMP_DB_PATH, jsonStr, "utf8");
  } catch {
    // In-memory state remains updated
  }
}

export function appendAuditLog(
  state: AeroSettleDatabaseState,
  params: {
    action: string;
    entityType: AuditLogRecord["entityType"];
    entityId: string;
    summary: string;
    metadata?: Record<string, unknown>;
  }
): AuditLogRecord {
  const activeUser =
    state.users.find((u) => u.id === state.activeUserId) || state.users[0];
  const prevHash =
    state.auditLogs[0]?.integrityHash ||
    "GENESIS_AEROSETTLE_AUDIT_CHAIN_0000000000";
  const integrityHash = computeAuditHash(
    prevHash,
    params.action,
    params.entityId,
    params.summary
  );

  const entry: AuditLogRecord = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    companyId: state.company.id,
    actorUserId: activeUser.id,
    actorName: activeUser.fullName,
    actorRole: activeUser.role,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    ipAddress: "198.51.100.42",
    summary: params.summary,
    metadataJson: JSON.stringify({
      previousChainHash: prevHash,
      ...(params.metadata || {}),
    }),
    integrityHash,
    createdAt: new Date().toISOString(),
  };

  state.auditLogs.unshift(entry);
  return entry;
}

export function checkActiveUserPermission(
  state: AeroSettleDatabaseState,
  permissionKey: keyof Omit<
    RolePermissionRecord,
    "role" | "label" | "description" | "maxSingleApprovalUsd"
  >
): { allowed: boolean; user: UserRecord; rolePerm: RolePermissionRecord } {
  const user =
    state.users.find((u) => u.id === state.activeUserId) || state.users[0];
  const rolePerm =
    state.rolePermissions.find((rp) => rp.role === user.role) ||
    state.rolePermissions[0];
  return {
    allowed: Boolean(rolePerm[permissionKey]),
    user,
    rolePerm,
  };
}
