export type AviationCategory =
  | "COMMERCIAL_AIRLINE"
  | "PRIVATE_JET_OPERATOR"
  | "AIRCRAFT_LEASING"
  | "MRO_FACILITY"
  | "FUEL_SUPPLIER"
  | "PARTS_DISTRIBUTOR"
  | "AIRPORT_AUTHORITY"
  | "GROUND_HANDLING";

export type UserRole =
  | "ADMINISTRATOR"
  | "FINANCE_MANAGER"
  | "PAYMENT_APPROVER"
  | "FINANCE_OPERATOR"
  | "READ_ONLY_AUDITOR";

export type VerificationStatus =
  | "VERIFIED"
  | "PENDING_KYB"
  | "UNDER_REVIEW"
  | "RESTRICTED";

export type ScreeningStatus =
  | "CLEARED"
  | "FLAGGED_MANUAL_REVIEW"
  | "BLOCKED";

export type PaymentStatus =
  | "DRAFT"
  | "AWAITING_APPROVAL"
  | "PROCESSING"
  | "PENDING_SETTLEMENT"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type SettlementRail =
  | "XRPL_BRIDGE"
  | "RLUSD_STABLECOIN"
  | "SWIFT_GPI"
  | "SEPA_INSTANT"
  | "FEDWIRE";

export type ExecutionClassification =
  | "SIMULATED_PAYMENT"
  | "SUBMITTED_BLOCKCHAIN_TX"
  | "VALIDATED_ON_CHAIN_TX"
  | "COMPLETED_EXTERNAL_FIAT_SETTLEMENT";

export type InvoiceStatus =
  | "OUTSTANDING"
  | "PAID"
  | "OVERDUE"
  | "PENDING_APPROVAL"
  | "PARTIALLY_PAID";

export type AccountCustodyType =
  | "EXTERNAL_BANK_LINKED"
  | "EXTERNAL_CUSTODY_VAULT"
  | "NON_CUSTODIAL_XRPL_SIGNER"
  | "INDICATIVE_VALUATION_ONLY";

export type XrplNetworkMode =
  | "SIMULATION_SANDBOX"
  | "XRPL_TESTNET"
  | "XRPL_MAINNET";

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  title: string;
  role: UserRole;
  department: string;
  mfaEnabled: boolean;
  mfaMethod: string;
  lastLoginAt: string;
}

export interface RolePermissionRecord {
  role: UserRole;
  label: string;
  description: string;
  canCreatePayment: boolean;
  canApprovePayment: boolean;
  canExecuteXrpl: boolean;
  canManageSuppliers: boolean;
  canCreateInvoice: boolean;
  canManageTreasury: boolean;
  canManageUsers: boolean;
  canExportAuditLogs: boolean;
  maxSingleApprovalUsd: string; // precise decimal string
}

export interface CompanyRecord {
  id: string;
  legalName: string;
  tradingName: string;
  icaoCode: string;
  iataCode: string;
  registrationNumber: string;
  taxId: string;
  countryCode: string;
  headquartersCity: string;
  primaryHubAirport: string;
  category: AviationCategory;
  baseCurrency: string;
  verificationStatus: VerificationStatus;
  dualControlThresholdUsd: string;
  requireDualApprovalOnXrpl: boolean;
  sanctionsScreeningProvider: string;
  createdAt: string;
}

export interface SupplierProfileRecord {
  faaEasaCertNumber?: string;
  iataFuelCode?: string;
  groundHandlingStations: string[];
  paymentTermsDays: number;
  preferredSettlementRail: SettlementRail;
  lifetimeVolumeUsd: string;
  averageSettlementSec: number;
  reliabilityScore: string;
}

export interface BeneficiaryRecord {
  id: string;
  companyId: string;
  legalName: string;
  tradingName: string;
  countryCode: string;
  countryName: string;
  city: string;
  airportIcao: string;
  category: AviationCategory;
  defaultCurrency: string;
  ibanOrAccount: string;
  swiftBic: string;
  bankName: string;
  xrplDestinationAddr?: string;
  xrplDestinationTag?: number;
  supportedRails: SettlementRail[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  verificationStatus: VerificationStatus;
  sanctionsStatus: ScreeningStatus;
  lastScreenedAt: string;
  supplierProfile: SupplierProfileRecord;
  createdAt: string;
}

export interface InvoiceLineItemRecord {
  id: string;
  description: string;
  skuOrPartNum?: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
}

export interface InvoiceRecord {
  id: string;
  companyId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryCategory: AviationCategory;
  beneficiaryCountry: string;
  invoiceNumber: string;
  direction: "PAYABLE" | "RECEIVABLE";
  currency: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  usdEquivalent: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  aircraftTailNumber?: string;
  flightNumber?: string;
  airportIcao?: string;
  documentFileName?: string;
  documentHashSha256?: string;
  notes?: string;
  matchedPaymentId?: string;
  lineItems: InvoiceLineItemRecord[];
  createdAt: string;
}

export interface CurrencyExchangeQuoteRecord {
  id: string;
  quoteReference: string;
  providerName: string;
  settlementRail: SettlementRail;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: string;
  destinationAmount: string;
  midMarketRate: string;
  appliedRate: string;
  bridgeAsset: "XRP" | "RLUSD" | null;
  bridgeRateXrpSource?: string;
  bridgeRateXrpDest?: string;
  bridgeXrpUnits?: string;
  networkFeeUsd: string;
  platformFeeUsd: string;
  totalFeeUsd: string;
  corridorSpreadBps: number;
  estimatedTimeSec: number;
  offRampPartner: string;
  corridorSupported: boolean;
  corridorNotes: string;
  expiresAt: string;
  createdAt: string;
}

export interface PaymentApprovalRecord {
  id: string;
  paymentId: string;
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  decision: "APPROVED" | "REJECTED";
  comment?: string;
  signature: string;
  decidedAt: string;
}

export interface XrplTransactionRecord {
  id: string;
  walletId: string;
  network: XrplNetworkMode;
  txHash: string | null; // Strictly null for simulated transactions; real 64-char hex only for real XRPL broadcast/verified txs
  simulationTraceId: string | null; // Populated when run in isolated simulation mode
  txType: "Payment" | "TrustSet" | "OfferCreate";
  sourceAddress: string;
  destinationAddress: string;
  destinationTag?: number;
  xrpAmountDrops: string;
  xrpAmountDecimal: string;
  deliveredAmountCurrency: string;
  deliveredAmountValue: string;
  feeDrops: string;
  ledgerIndex: number | null;
  engineResult: string;
  validatedOnLedger: boolean;
  externalFiatOffRampStatus:
    | "NOT_APPLICABLE"
    | "PENDING_PARTNER_PAYOUT"
    | "COMPLETED_PARTNER_RAIL"
    | "SIMULATED_OFFRAMP";
  executionClassification: ExecutionClassification;
  memoHex: string;
  rawTxJson: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentReference: string;
  companyId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryCountry: string;
  beneficiaryCategory: AviationCategory;
  initiatorUserId: string;
  initiatorName: string;
  quoteId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  sourceCurrency: string;
  sourceAmount: string;
  destinationCurrency: string;
  destinationAmount: string;
  usdEquivalent: string;
  exchangeRate: string;
  totalFeeUsd: string;
  settlementRail: SettlementRail;
  status: PaymentStatus;
  executionClassification: ExecutionClassification;
  purposeCode: string;
  aircraftTailNumber?: string;
  airportIcao?: string;
  memoText?: string;
  requiresDualApproval: boolean;
  requiredApprovalsCount: number;
  approvals: PaymentApprovalRecord[];
  xrplRecord?: XrplTransactionRecord;
  externalBankRef?: string;
  settlementDurationSec?: number;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TransactionLedgerRecord {
  id: string;
  transactionReference: string;
  paymentId: string;
  paymentReference: string;
  companyId: string;
  beneficiaryId: string;
  senderName: string;
  recipientName: string;
  recipientCountry: string;
  recipientCategory: AviationCategory;
  airportIcao: string;
  aircraftTailNumber?: string;
  invoiceNumber?: string;
  sourceCurrency: string;
  sourceAmount: string;
  destinationCurrency: string;
  destinationAmount: string;
  usdEquivalent: string;
  exchangeRate: string;
  feeAmountUsd: string;
  settlementRail: SettlementRail;
  status: PaymentStatus;
  executionClassification: ExecutionClassification;
  settlementDurationSec: number;
  externalBankRef?: string;
  xrplTxHash?: string | null;
  simulationTraceId?: string | null;
  xrplRecord?: XrplTransactionRecord;
  createdAt: string;
  settledAt?: string;
}

export interface TreasuryAccountRecord {
  id: string;
  companyId: string;
  accountCode: string;
  accountName: string;
  currency: string;
  assetType: "FIAT_BANK_ACCOUNT" | "XRPL_NATIVE_ASSET" | "REGULATED_STABLECOIN";
  custodyType: AccountCustodyType;
  custodyDisclosure: string;
  institutionName: string;
  accountIdentifier: string;
  availableBalance: string;
  reservedBalance: string;
  usdEquivalent: string;
  lastSyncedAt: string;
}

export interface WalletReferenceRecord {
  id: string;
  companyId: string;
  label: string;
  network: XrplNetworkMode;
  classicAddress: string;
  xAddress: string;
  custodyArchitecture: string;
  xrpBalanceDrops: string;
  xrpBalanceDecimal: string;
  rlusdBalanceDecimal: string;
  baseReserveXrp: string;
  ownerReserveXrp: string;
  sequenceNumber: number;
  isSimulated: boolean;
  lastLedgerIndex: number | null;
  updatedAt: string;
}

export interface PaymentCorridorSpec {
  id: string;
  name: string;
  sourceCurrency: string;
  destinationCurrency: string;
  originHub: string;
  destinationHub: string;
  destinationCountry: string;
  aviationUseCase: string;
  supported: boolean;
  xrplBridgeSupported: boolean;
  stablecoinSupported: boolean;
  traditionalRail: SettlementRail;
  xrplSpreadBps: number;
  traditionalSpreadBps: number;
  xrplEstimatedSec: number;
  traditionalEstimatedSec: number;
  xrplFixedFeeUsd: string;
  traditionalFixedFeeUsd: string;
  liquidityProvider: string;
  offRampRailName: string;
  regulatoryNote: string;
}

export interface AuditLogRecord {
  id: string;
  companyId: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: "PAYMENT" | "INVOICE" | "BENEFICIARY" | "WALLET" | "SETTINGS" | "AUTH";
  entityId: string;
  ipAddress: string;
  summary: string;
  metadataJson: string;
  integrityHash: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  companyId: string;
  severity: "INFO" | "ACTION_REQUIRED" | "SUCCESS" | "WARNING";
  title: string;
  message: string;
  linkTab?: string;
  isRead: boolean;
  createdAt: string;
}
