"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Plane,
  LayoutDashboard,
  Send,
  Globe2,
  Building2,
  FileText,
  Landmark,
  History,
  BarChart3,
  Settings,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  UserCheck,
  Lock,
  Eye,
  XCircle,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";
import { DecimalMoney, formatDecimalCurrency } from "@/lib/decimal";
import {
  AviationCategory,
  AuditLogRecord,
  BeneficiaryRecord,
  CompanyRecord,
  CurrencyExchangeQuoteRecord,
  InvoiceRecord,
  NotificationRecord,
  PaymentCorridorSpec,
  PaymentRecord,
  RolePermissionRecord,
  SettlementRail,
  TransactionLedgerRecord,
  TreasuryAccountRecord,
  UserRecord,
  WalletReferenceRecord,
  XrplNetworkMode,
} from "@/types/aerosettle";
import {
  ExecutionClassificationBadge,
  OnboardingAndAuthModal,
  PaymentConfirmationModal,
} from "@/components/PaymentConfirmationModal";
import {
  InternationalSettlementView,
  TreasuryOverviewView,
} from "@/components/SettlementAndTreasuryViews";
import {
  AnalyticsAndReportingView,
  SettingsAndCompanyView,
} from "@/components/AnalyticsAndSettingsViews";

type NavSectionId =
  | "dashboard"
  | "payments"
  | "settlement"
  | "beneficiaries"
  | "invoices"
  | "treasury"
  | "transactions"
  | "analytics"
  | "settings";

interface PlatformStateResponse {
  isDemoEnvironment: boolean;
  activeUserId: string;
  xrplNetworkMode: XrplNetworkMode;
  company: CompanyRecord;
  activeUser: UserRecord;
  activePermissions: RolePermissionRecord;
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
  corridors: PaymentCorridorSpec[];
  fxRates: Record<string, string>;
  kpis: {
    totalVolumeUsd: string;
    totalPaymentsSentUsd: string;
    totalPaymentsReceivedUsd: string;
    completedPaymentsCount: number;
    pendingPaymentsCount: number;
    averageSettlementSec: number;
    totalTreasuryUsd: string;
    outstandingPayablesUsd: string;
  };
}

export default function AeroSettleApp() {
  const [activeTab, setActiveTab] = useState<NavSectionId>("dashboard");
  const [data, setData] = useState<PlatformStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Modals & Inspection State
  const [selectedConfirmationPayment, setSelectedConfirmationPayment] =
    useState<PaymentRecord | null>(null);
  const [isAuthOnboardingOpen, setIsAuthOnboardingOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleSelectNav = (tab: NavSectionId) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Payment Creation Wizard State (Create -> Review -> Submit -> Confirm)
  const [paymentWizardStep, setPaymentWizardStep] = useState<
    "FORM" | "REVIEW"
  >("FORM");
  const [payBeneficiaryId, setPayBeneficiaryId] = useState<string>("");
  const [payInvoiceId, setPayInvoiceId] = useState<string>("");
  const [payInvoiceNumber, setPayInvoiceNumber] = useState<string>("");
  const [paySourceCurrency, setPaySourceCurrency] = useState<string>("USD");
  const [payDestCurrency, setPayDestCurrency] = useState<string>("AED");
  const [payAmount, setPayAmount] = useState<string>("148672.57");
  const [payRail, setPayRail] = useState<SettlementRail>("XRPL_BRIDGE");
  const [payPurpose, setPayPurpose] = useState<string>("JET_A1_UPLIFT");
  const [payTailNumber, setPayTailNumber] = useState<string>("N789AS");
  const [payAirportIcao, setPayAirportIcao] = useState<string>("OMDB");
  const [payMemo, setPayMemo] = useState<string>(
    "Widebody Jet A-1 Hydrant Uplift Settlement at OMDB Gate C14"
  );
  const [liveQuote, setLiveQuote] =
    useState<CurrencyExchangeQuoteRecord | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Beneficiary Filter & New Supplier Modal
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState("ALL");
  const [selectedBeneficiaryDetail, setSelectedBeneficiaryDetail] =
    useState<BeneficiaryRecord | null>(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupLegalName, setNewSupLegalName] = useState("");
  const [newSupTradingName, setNewSupTradingName] = useState("");
  const [newSupCountryCode, setNewSupCountryCode] = useState("AE");
  const [newSupCountryName, setNewSupCountryName] = useState(
    "United Arab Emirates"
  );
  const [newSupCity, setNewSupCity] = useState("Dubai");
  const [newSupIcao, setNewSupIcao] = useState("OMDB");
  const [newSupCategory, setNewSupCategory] =
    useState<AviationCategory>("FUEL_SUPPLIER");
  const [newSupCurrency, setNewSupCurrency] = useState("AED");
  const [newSupIban, setNewSupIban] = useState("AE070331234567890999888");
  const [newSupSwift, setNewSupSwift] = useState("EBILAEADXXX");
  const [newSupXrplAddr, setNewSupXrplAddr] = useState(
    "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"
  );
  const [newSupCert, setNewSupCert] = useState("EASA.145.0982");

  // Invoices Filter & Create Invoice Modal
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("ALL");
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invBeneficiaryId, setInvBeneficiaryId] = useState("");
  const [invNumber, setInvNumber] = useState("INV-DXB-2026-9104");
  const [invCurrency, setInvCurrency] = useState("AED");
  const [invDueDate, setInvDueDate] = useState("2026-11-25");
  const [invTailNumber, setInvTailNumber] = useState("N789AS");
  const [invFlightNumber, setInvFlightNumber] = useState("AG-402");
  const [invDocName, setInvDocName] = useState(
    "Supplier_Aviation_Invoice_9104.pdf"
  );
  const [invLineDesc, setInvLineDesc] = useState(
    "Jet A-1 Hydrant Refueling Uplift (OMDB)"
  );
  const [invLineQty, setInvLineQty] = useState("85000");
  const [invLineUnit, setInvLineUnit] = useState("LITERS");
  const [invLinePrice, setInvLinePrice] = useState("3.20");

  // Transaction History Filters
  const [txSearch, setTxSearch] = useState("");
  const [txCurrencyFilter, setTxCurrencyFilter] = useState("ALL");
  const [txCountryFilter, setTxCountryFilter] = useState("ALL");
  const [txStatusFilter, setTxStatusFilter] = useState("ALL");
  const [txRailFilter, setTxRailFilter] = useState("ALL");
  const [txMinAmount, setTxMinAmount] = useState("");

  const showToast = (
    text: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchPlatformData = async () => {
    try {
      const res = await fetch("/api/platform");
      const json: PlatformStateResponse = await res.json();
      setData(json);
      if (!payBeneficiaryId && json.beneficiaries.length > 0) {
        const firstBen = json.beneficiaries[0];
        setPayBeneficiaryId(firstBen.id);
        setPayDestCurrency(firstBen.defaultCurrency);
        setPayAirportIcao(firstBen.airportIcao);
        setInvBeneficiaryId(firstBen.id);
      }
    } catch {
      showToast("Failed to load platform state.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  // Automatically refresh quote when payment inputs change
  useEffect(() => {
    if (!payAmount || Number(payAmount) <= 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/platform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CREATE_QUOTE",
            sourceCurrency: paySourceCurrency,
            destinationCurrency: payDestCurrency,
            sourceAmount: payAmount,
            settlementRail: payRail,
          }),
        });
        const json = await res.json();
        if (json.quote) setLiveQuote(json.quote);
      } catch {
        // ignore quote poll errors
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [paySourceCurrency, payDestCurrency, payAmount, payRail]);

  const handleSelectBeneficiaryForPayment = (benId: string) => {
    setPayBeneficiaryId(benId);
    const ben = data?.beneficiaries.find((b) => b.id === benId);
    if (ben) {
      setPayDestCurrency(ben.defaultCurrency);
      setPayAirportIcao(ben.airportIcao);
      setPayRail(ben.supplierProfile.preferredSettlementRail);
      setPayMemo(
        `Aviation Supplier Settlement to ${ben.tradingName} (${ben.airportIcao})`
      );
    }
  };

  const handleLaunchPayInvoice = (inv: InvoiceRecord) => {
    setPayBeneficiaryId(inv.beneficiaryId);
    setPayInvoiceId(inv.id);
    setPayInvoiceNumber(inv.invoiceNumber);
    setPaySourceCurrency("USD");
    setPayDestCurrency(inv.currency);
    setPayAmount(inv.usdEquivalent);
    setPayRail("XRPL_BRIDGE");
    setPayTailNumber(inv.aircraftTailNumber || "N789AS");
    setPayAirportIcao(inv.airportIcao || "OMDB");
    setPayMemo(
      `Invoice Settlement: ${inv.invoiceNumber} (${inv.beneficiaryName})`
    );
    setPaymentWizardStep("FORM");
    setActiveTab("payments");
    showToast(
      `Pre-loaded invoice ${inv.invoiceNumber} (${inv.currency} ${inv.totalAmount}) into Payment Builder.`,
      "info"
    );
  };

  const handleLaunchCorridorPayment = (corridor: PaymentCorridorSpec) => {
    const matchingBen = data?.beneficiaries.find(
      (b) => b.defaultCurrency === corridor.destinationCurrency
    );
    if (matchingBen) {
      setPayBeneficiaryId(matchingBen.id);
    }
    setPaySourceCurrency(corridor.sourceCurrency);
    setPayDestCurrency(corridor.destinationCurrency);
    setPayRail(corridor.xrplBridgeSupported ? "XRPL_BRIDGE" : "SWIFT_GPI");
    setPayAmount("125000.00");
    setPayMemo(`Corridor Settlement: ${corridor.name}`);
    setPaymentWizardStep("FORM");
    setActiveTab("payments");
  };

  const handleExecuteCreatePayment = async (opts: {
    saveAsDraft?: boolean;
    forceImmediateAuthorizedExecution?: boolean;
  }) => {
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PAYMENT",
          beneficiaryId: payBeneficiaryId,
          invoiceId: payInvoiceId || undefined,
          invoiceNumber: payInvoiceNumber || undefined,
          sourceCurrency: paySourceCurrency,
          destinationCurrency: payDestCurrency,
          sourceAmount: payAmount,
          settlementRail: payRail,
          purposeCode: payPurpose,
          aircraftTailNumber: payTailNumber,
          airportIcao: payAirportIcao,
          memoText: payMemo,
          saveAsDraft: opts.saveAsDraft,
          forceImmediateAuthorizedExecution:
            opts.forceImmediateAuthorizedExecution,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Payment creation failed.", "error");
        return;
      }
      await fetchPlatformData();
      setPaymentWizardStep("FORM");
      setPayInvoiceId("");
      setPayInvoiceNumber("");
      setSelectedConfirmationPayment(json.payment);
      showToast(
        `Payment ${json.payment.paymentReference} created (${json.payment.status}).`,
        "success"
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleApproveOrRejectPayment = async (
    paymentId: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    const res = await fetch("/api/platform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "APPROVE_OR_REJECT_PAYMENT",
        paymentId,
        decision,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Approval action denied.", "error");
      return;
    }
    await fetchPlatformData();
    if (decision === "APPROVED") {
      setSelectedConfirmationPayment(json.payment);
    }
    showToast(
      `Payment ${json.payment.paymentReference} ${decision.toLowerCase()}.`,
      "success"
    );
  };

  const handleCompletePendingSettlement = async (paymentId: string) => {
    const res = await fetch("/api/platform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "COMPLETE_PENDING_SETTLEMENT",
        paymentId,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      await fetchPlatformData();
      setSelectedConfirmationPayment(json.payment);
      showToast(
        `Confirmed local off-ramp payout for ${json.payment.paymentReference}.`,
        "success"
      );
    }
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/platform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_BENEFICIARY",
        legalName: newSupLegalName,
        tradingName: newSupTradingName || newSupLegalName,
        countryCode: newSupCountryCode,
        countryName: newSupCountryName,
        city: newSupCity,
        airportIcao: newSupIcao,
        category: newSupCategory,
        defaultCurrency: newSupCurrency,
        ibanOrAccount: newSupIban,
        swiftBic: newSupSwift,
        xrplDestinationAddr: newSupXrplAddr,
        faaEasaCertNumber: newSupCert,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Could not add beneficiary.", "error");
      return;
    }
    setShowAddSupplierModal(false);
    setNewSupLegalName("");
    setNewSupTradingName("");
    await fetchPlatformData();
    showToast(
      `Added verified supplier ${json.beneficiary.tradingName}.`,
      "success"
    );
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/platform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_INVOICE",
        beneficiaryId: invBeneficiaryId,
        invoiceNumber: invNumber,
        currency: invCurrency,
        dueDate: invDueDate,
        aircraftTailNumber: invTailNumber,
        flightNumber: invFlightNumber,
        documentFileName: invDocName,
        taxRateBps: 500, // 5% VAT/Tax
        lineItems: [
          {
            description: invLineDesc,
            skuOrPartNum: "AV-LINE-001",
            quantity: invLineQty,
            unit: invLineUnit,
            unitPrice: invLinePrice,
          },
        ],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Failed to create invoice.", "error");
      return;
    }
    setShowCreateInvoiceModal(false);
    await fetchPlatformData();
    showToast(
      `Created invoice ${json.invoice.invoiceNumber} (${json.invoice.currency} ${json.invoice.totalAmount}).`,
      "success"
    );
  };

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      if (txCurrencyFilter !== "ALL" && t.destinationCurrency !== txCurrencyFilter)
        return false;
      if (txCountryFilter !== "ALL" && t.recipientCountry !== txCountryFilter)
        return false;
      if (txStatusFilter !== "ALL" && t.status !== txStatusFilter) return false;
      if (txRailFilter !== "ALL" && t.settlementRail !== txRailFilter)
        return false;
      if (
        txMinAmount &&
        Number(t.usdEquivalent) < Number(txMinAmount)
      ) {
        return false;
      }
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const match =
          t.transactionReference.toLowerCase().includes(q) ||
          t.paymentReference.toLowerCase().includes(q) ||
          t.recipientName.toLowerCase().includes(q) ||
          t.airportIcao.toLowerCase().includes(q) ||
          (t.invoiceNumber || "").toLowerCase().includes(q) ||
          (t.simulationTraceId || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    data,
    txCurrencyFilter,
    txCountryFilter,
    txStatusFilter,
    txRailFilter,
    txMinAmount,
    txSearch,
  ]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a1929] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center mb-4 animate-pulse">
          <Plane className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">
          AEROSETTLE — Global Aviation Payment & Settlement Platform
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Initializing XRPL Service Layer, Multi-Currency Treasury & Aviation
          Supplier Ledger...
        </p>
      </div>
    );
  }

  const navItems: Array<{
    id: NavSectionId;
    label: string;
    subtitle: string;
    group: "OPERATIONS" | "COUNTERPARTIES" | "TREASURY_GOVERNANCE";
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    {
      id: "dashboard",
      label: "Executive Dashboard",
      subtitle: "Fleet settlement overview & KPIs",
      group: "OPERATIONS",
      icon: LayoutDashboard,
    },
    {
      id: "payments",
      label: "Payments & Approvals",
      subtitle: "Initiate & authorize supplier payouts",
      group: "OPERATIONS",
      icon: Send,
      badge: data.kpis.pendingPaymentsCount || undefined,
    },
    {
      id: "settlement",
      label: "International Settlement",
      subtitle: "XRPL corridors, FX quotes & tx verifier",
      group: "OPERATIONS",
      icon: Globe2,
      badge: "XRPL",
    },
    {
      id: "beneficiaries",
      label: "Beneficiaries & Suppliers",
      subtitle: "Verified fuel, MRO & AOG counterparties",
      group: "COUNTERPARTIES",
      icon: Building2,
      badge: data.beneficiaries.length,
    },
    {
      id: "invoices",
      label: "Aviation Invoices",
      subtitle: "3-way invoice match & reconciliation",
      group: "COUNTERPARTIES",
      icon: FileText,
      badge: data.invoices.filter((i) => i.status !== "PAID").length,
    },
    {
      id: "treasury",
      label: "Multi-Currency Treasury",
      subtitle: "Linked banks & non-custodial XRPL",
      group: "TREASURY_GOVERNANCE",
      icon: Landmark,
    },
    {
      id: "transactions",
      label: "Transaction History",
      subtitle: "Immutable audit ledger & CSV exports",
      group: "TREASURY_GOVERNANCE",
      icon: History,
    },
    {
      id: "analytics",
      label: "Analytics & Reporting",
      subtitle: "Corridor velocity & FX spread savings",
      group: "TREASURY_GOVERNANCE",
      icon: BarChart3,
    },
    {
      id: "settings",
      label: "Settings & Governance",
      subtitle: "Dual-control policies, RBAC & audit log",
      group: "TREASURY_GOVERNANCE",
      icon: Settings,
    },
  ];

  const activeNavItem =
    navItems.find((item) => item.id === activeTab) || navItems[0];

  const navGroups: Array<{
    key: "OPERATIONS" | "COUNTERPARTIES" | "TREASURY_GOVERNANCE";
    title: string;
  }> = [
    { key: "OPERATIONS", title: "Core Operations" },
    { key: "COUNTERPARTIES", title: "Suppliers & Billing" },
    { key: "TREASURY_GOVERNANCE", title: "Treasury & Governance" },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900 relative">
      {/* Mobile Backdrop Overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Left Enterprise Dark-Navy Navigation Panel */}
      <aside
        aria-label="Primary Navigation Panel"
        className={`fixed md:sticky top-0 left-0 z-50 h-screen bg-[#0a1929] text-white flex flex-col justify-between shrink-0 border-r border-slate-800 transition-all duration-200 overflow-y-auto ${
          isSidebarCollapsed ? "w-72 md:w-20" : "w-72"
        } ${
          isMobileNavOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Logo & Collapse Control */}
          <div className="p-4 border-b border-slate-800/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-inner shrink-0">
                <Plane className="w-5 h-5 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base tracking-tight truncate">
                      AEROSETTLE
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      XRPL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Aviation Payment & Settlement OS
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={
                isSidebarCollapsed
                  ? "Expand left navigation panel"
                  : "Collapse left navigation panel"
              }
              className="hidden md:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition shrink-0"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Mobile Close Drawer Button */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Airline Entity Card */}
          {!isSidebarCollapsed && (
            <div className="px-4 py-3.5 border-b border-slate-800/80 bg-[#102a43]/70">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-mono uppercase">
                  ICAO: {data.company.icaoCode} • HUB:{" "}
                  {data.company.primaryHubAirport}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 font-mono text-[10px]">
                  DEMO
                </span>
              </div>
              <div className="text-xs font-semibold text-white mt-1 truncate">
                {data.company.legalName}
              </div>
              <button
                onClick={() => setIsAuthOnboardingOpen(true)}
                className="mt-2 text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
              >
                Entity Onboarding / Auth MFA
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Grouped Left Navigation Options */}
          <nav className="p-3 space-y-4">
            {navGroups.map((grp) => {
              const items = navItems.filter((i) => i.group === grp.key);
              return (
                <div key={grp.key} className="space-y-1">
                  {!isSidebarCollapsed && (
                    <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      {grp.title}
                    </div>
                  )}
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={`${item.label} — ${item.subtitle}`}
                        onClick={() => handleSelectNav(item.id)}
                        className={`w-full group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40"
                            : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? "text-white"
                                : "text-slate-400 group-hover:text-blue-300"
                            }`}
                          />
                          {!isSidebarCollapsed && (
                            <div className="min-w-0">
                              <div className="text-xs font-semibold leading-tight truncate">
                                {item.label}
                              </div>
                              <div
                                className={`text-[11px] leading-tight mt-0.5 truncate ${
                                  isActive
                                    ? "text-blue-100"
                                    : "text-slate-400 group-hover:text-slate-300"
                                }`}
                              >
                                {item.subtitle}
                              </div>
                            </div>
                          )}
                        </div>
                        {!isSidebarCollapsed && item.badge !== undefined && (
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold shrink-0 ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom XRPL Status & Role Footer */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-2.5 text-xs bg-[#071320]">
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">XRPL Network</span>
                <span className="font-mono text-[11px] text-blue-400 font-semibold">
                  {data.xrplNetworkMode}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400">Signed in as:</div>
                <div className="font-semibold text-white truncate">
                  {data.activeUser.fullName}
                </div>
                <div className="font-mono text-[10px] text-blue-400 mt-0.5">
                  Role: {data.activeUser.role}
                </div>
              </div>
            </>
          ) : (
            <div
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-mono text-blue-400"
              title={`XRPL: ${data.xrplNetworkMode} | Signed in as ${data.activeUser.fullName}`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>XRPL</span>
            </div>
          )}
        </div>
      </aside>

      {/* Right Main Reading & Workspace Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Executive Bar showing Active Section & Controls */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Open left navigation panel"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">
                  {activeNavItem.label}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  DEMO DATA
                </span>
                <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-700">
                  1 XRP = $2.45 USD • Dual-Control ≥ $
                  {Number(data.company.dualControlThresholdUsd).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {activeNavItem.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live RBAC Role Switcher Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <UserCheck className="w-4 h-4 text-slate-500" />
              <span className="text-slate-500 hidden sm:inline">
                Active Role:
              </span>
              <select
                aria-label="Switch Active User Role"
                value={data.activeUser.id}
                onChange={async (e) => {
                  const res = await fetch("/api/platform", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "SWITCH_ROLE_USER",
                      userId: e.target.value,
                    }),
                  });
                  if (res.ok) {
                    await fetchPlatformData();
                    showToast("Switched active RBAC user session.", "info");
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-semibold text-slate-800 text-xs"
              >
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Prominent Send Payment CTA */}
            <button
              onClick={() => {
                setPaymentWizardStep("FORM");
                handleSelectNav("payments");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Send className="w-3.5 h-3.5" />
              Send Payment
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {toastMsg && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm ${
              toastMsg.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : toastMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            <span>{toastMsg.text}</span>
            <button
              onClick={() => setToastMsg(null)}
              className="text-xs underline ml-4"
            >
              Close
            </button>
          </div>
        )}

        {/* Dynamic Section Body */}
        <main className="p-6 flex-1 space-y-6 max-w-[1520px] w-full mx-auto">
          {/* =========================================================
              SECTION A: EXECUTIVE DASHBOARD
          ========================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Top Executive Banner */}
              <div className="bg-[#0a1929] text-white rounded-xl p-6 border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Global Fleet Financial Command
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {data.company.legalName} ({data.company.icaoCode})
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mt-2">
                    Executive Aviation Settlement Dashboard
                  </h1>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Centralized cross-border treasury and real-time XRPL
                    settlement across Dubai fuel suppliers (`OMDB`), German MRO
                    facilities (`EDDF`), Singapore AOG parts (`WSSS`), and
                    Brazilian ground handling (`SBGR`).
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab("payments")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                  >
                    <Send className="w-4 h-4" />
                    Send International Payment
                  </button>
                  <button
                    onClick={() => setActiveTab("settlement")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                  >
                    <Globe2 className="w-4 h-4 text-blue-400" />
                    Inspect XRPL Corridors
                  </button>
                </div>
              </div>

              {/* 8 Executive KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Total Transaction Volume</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                    {formatDecimalCurrency(
                      DecimalMoney.fromString(data.kpis.totalPaymentsSentUsd)
                        .add(
                          DecimalMoney.fromString(
                            data.kpis.totalPaymentsReceivedUsd
                          )
                        )
                        .toFixed(2),
                      "USD"
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Combined outbound supplier + inbound codeshare volume
                  </p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Total Payments Sent (Outbound)</span>
                    <Send className="w-4 h-4 text-slate-700" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                    {formatDecimalCurrency(
                      data.kpis.totalPaymentsSentUsd,
                      "USD"
                    )}
                  </div>
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    {data.kpis.completedPaymentsCount} completed supplier
                    settlements
                  </p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Total Payments Received (Inbound)</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                    {formatDecimalCurrency(
                      data.kpis.totalPaymentsReceivedUsd,
                      "USD"
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Interline clearing & ACMI wet-lease receivables
                  </p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Average Settlement Time</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700 font-mono mt-2">
                    {data.kpis.averageSettlementSec} seconds
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    3.8s XRPL leg + instant local partner off-ramp
                  </p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">
                    Pending Approvals & Settlement
                  </span>
                  <div className="text-xl font-bold text-amber-700 font-mono mt-1.5">
                    {data.kpis.pendingPaymentsCount} Active Queue Items
                  </div>
                  <button
                    onClick={() => setActiveTab("payments")}
                    className="text-xs text-blue-600 font-semibold hover:underline mt-1 inline-block"
                  >
                    Review Approval Queue →
                  </button>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">
                    Completed Settlements
                  </span>
                  <div className="text-xl font-bold text-emerald-700 font-mono mt-1.5">
                    {data.kpis.completedPaymentsCount} Settled (100% Recon)
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Zero failed on-ledger executions
                  </p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">
                    Multi-Currency Treasury Exposure
                  </span>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-1.5">
                    {formatDecimalCurrency(data.kpis.totalTreasuryUsd, "USD")}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    USD 55% • XRP 25% • EUR 14% • AED 6%
                  </p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">
                    Unpaid Aviation Invoices
                  </span>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-1.5">
                    {formatDecimalCurrency(
                      data.kpis.outstandingPayablesUsd,
                      "USD"
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab("invoices")}
                    className="text-xs text-blue-600 font-semibold hover:underline mt-1 inline-block"
                  >
                    Match & Pay Invoices →
                  </button>
                </div>
              </div>

              {/* Charts Row: Monthly Activity + Currency & Country Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Transaction Volume & Monthly Activity Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Monthly Aviation Payment Activity & Rail Velocity (DEMO
                        DATA)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Comparison of XRPL Bridge & RLUSD settlements vs.
                        traditional correspondent wires
                      </p>
                    </div>
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      +34.2% QoQ XRPL Adoption
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-3 items-end h-48 pt-6 px-2 border-b border-slate-200">
                    {[
                      { m: "Jun", xrpl: 58, wire: 25, vol: "$900k" },
                      { m: "Jul", xrpl: 68, wire: 20, vol: "$1.00M" },
                      { m: "Aug", xrpl: 76, wire: 18, vol: "$1.10M" },
                      { m: "Sep", xrpl: 85, wire: 15, vol: "$1.26M" },
                      { m: "Oct", xrpl: 94, wire: 12, vol: "$1.41M" },
                      { m: "Nov", xrpl: 88, wire: 10, vol: "$1.18M" },
                    ].map((bar) => (
                      <div
                        key={bar.m}
                        className="flex flex-col items-center gap-1.5 h-full justify-end"
                      >
                        <span className="text-[10px] font-mono text-slate-600 font-semibold">
                          {bar.vol}
                        </span>
                        <div className="w-full max-w-[44px] flex flex-col justify-end rounded-t overflow-hidden">
                          <div
                            style={{ height: `${bar.wire}px` }}
                            className="bg-slate-300 w-full"
                            title="Traditional Wire"
                          />
                          <div
                            style={{ height: `${bar.xrpl}px` }}
                            className="bg-blue-600 w-full"
                            title="XRPL Bridge & RLUSD"
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 pt-1">
                          {bar.m}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                        XRPL Bridge / RLUSD Stablecoin
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                        Legacy SWIFT / Correspondent Wire
                      </span>
                    </div>
                    <span className="font-mono">
                      Avg XRPL Fee: 12 drops (&lt;$0.01)
                    </span>
                  </div>
                </div>

                {/* Payment Distribution by Currency & Country */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Distribution by Destination Currency & Hub
                    </h3>
                    <p className="text-xs text-slate-500">
                      Settled supplier volume by local aviation corridor
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    {[
                      {
                        curr: "GBP (London EGLL Leasing)",
                        pct: 39,
                        amt: "£335,035.00",
                        color: "bg-indigo-600",
                      },
                      {
                        curr: "EUR (Frankfurt EDDF MRO)",
                        pct: 29,
                        amt: "€291,000.00",
                        color: "bg-blue-600",
                      },
                      {
                        curr: "AED (Dubai OMDB Jet Fuel)",
                        pct: 18,
                        amt: "AED 682,500.00",
                        color: "bg-sky-500",
                      },
                      {
                        curr: "SGD (Singapore WSSS AOG Parts)",
                        pct: 10,
                        amt: "S$145,200.00",
                        color: "bg-emerald-600",
                      },
                      {
                        curr: "BRL (São Paulo SBGR Ground)",
                        pct: 4,
                        amt: "R$278,250.00",
                        color: "bg-amber-500",
                      },
                    ].map((row) => (
                      <div key={row.curr} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-800">
                            {row.curr}
                          </span>
                          <span className="font-mono font-semibold text-slate-900">
                            {row.amt} ({row.pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${row.pct}%` }}
                            className={`h-full ${row.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Transactions & Activity Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Recent International Aviation Settlements
                      </h3>
                      <p className="text-xs text-slate-500">
                        Click any settlement to view its confirmation receipt &
                        XRPL payload
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("transactions")}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View Full Ledger →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Reference & Station</th>
                          <th className="py-3 px-4">Supplier Counterparty</th>
                          <th className="py-3 px-4">Rail & Classification</th>
                          <th className="py-3 px-4 text-right">
                            Settled Amount
                          </th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {data.payments.slice(0, 5).map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-4">
                              <div className="font-mono font-bold text-slate-900">
                                {p.paymentReference}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                ICAO: {p.airportIcao} • Tail:{" "}
                                {p.aircraftTailNumber}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">
                                {p.beneficiaryName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {p.beneficiaryCountry} •{" "}
                                {p.beneficiaryCategory.replace(/_/g, " ")}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-semibold text-blue-700 block">
                                {p.settlementRail}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {p.status} ({p.executionClassification})
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              {formatDecimalCurrency(
                                p.destinationAmount,
                                p.destinationCurrency
                              )}
                              <div className="text-[11px] font-normal text-slate-500">
                                (${Number(p.usdEquivalent).toLocaleString()}{" "}
                                USD)
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() =>
                                  setSelectedConfirmationPayment(p)
                                }
                                className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Operational Activity Feed */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      Real-Time Treasury & Compliance Feed
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Recent alerts, invoice matches, and audit events
                    </p>
                    <div className="space-y-3 text-xs">
                      {data.notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-lg border ${
                            n.severity === "ACTION_REQUIRED"
                              ? "bg-amber-50/70 border-amber-200"
                              : n.severity === "WARNING"
                                ? "bg-red-50/70 border-red-200"
                                : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="font-bold text-slate-900">
                            {n.title}
                          </div>
                          <p className="text-slate-600 mt-0.5">{n.message}</p>
                          {n.linkTab && (
                            <button
                              onClick={() =>
                                setActiveTab(n.linkTab as NavSectionId)
                              }
                              className="text-blue-600 font-semibold hover:underline mt-1.5 inline-block"
                            >
                              Open Module →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION B: PAYMENTS & APPROVAL QUEUE
          ========================================================= */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Create & Review Payment Wizard */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                    <div>
                      <span className="text-xs font-mono uppercase text-blue-600 font-semibold">
                        Modular Aviation Settlement Builder
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">
                        {paymentWizardStep === "FORM"
                          ? "Step 1: Configure International Supplier Payment"
                          : "Step 2: Review FX Quote, Governance & Submit"}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span
                        className={`px-2.5 py-1 rounded ${
                          paymentWizardStep === "FORM"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        1. Configure
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded ${
                          paymentWizardStep === "REVIEW"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        2. Review & Confirm
                      </span>
                    </div>
                  </div>

                  {paymentWizardStep === "FORM" ? (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Select Verified Aviation Beneficiary
                          </label>
                          <select
                            aria-label="Select Verified Aviation Beneficiary"
                            value={payBeneficiaryId}
                            onChange={(e) =>
                              handleSelectBeneficiaryForPayment(e.target.value)
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                          >
                            {data.beneficiaries.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.tradingName} ({b.airportIcao} •{" "}
                                {b.defaultCurrency} • {b.verificationStatus})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Link to Unpaid Supplier Invoice (Optional 3-Way
                            Match)
                          </label>
                          <select
                            aria-label="Link to Unpaid Supplier Invoice"
                            value={payInvoiceId}
                            onChange={(e) => {
                              const id = e.target.value;
                              setPayInvoiceId(id);
                              const inv = data.invoices.find(
                                (i) => i.id === id
                              );
                              if (inv) {
                                handleLaunchPayInvoice(inv);
                              } else {
                                setPayInvoiceNumber("");
                              }
                            }}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                          >
                            <option value="">
                              -- Direct Payment (No Linked Invoice) --
                            </option>
                            {data.invoices
                              .filter((i) => i.status !== "PAID")
                              .map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.invoiceNumber} — {inv.beneficiaryName} (
                                  {inv.currency} {inv.totalAmount} / $
                                  {inv.usdEquivalent} USD)
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Payment Amount (Source)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 font-mono text-sm font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Source Currency
                          </label>
                          <select
                            aria-label="Source Currency"
                            value={paySourceCurrency}
                            onChange={(e) =>
                              setPaySourceCurrency(e.target.value)
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white font-mono font-semibold text-slate-900"
                          >
                            <option value="USD">USD — US Dollar</option>
                            <option value="EUR">EUR — Euro</option>
                            <option value="GBP">GBP — British Pound</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Destination Currency
                          </label>
                          <select
                            aria-label="Destination Currency"
                            value={payDestCurrency}
                            onChange={(e) => setPayDestCurrency(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white font-mono font-semibold text-slate-900"
                          >
                            <option value="AED">AED — UAE Dirham (OMDB)</option>
                            <option value="EUR">EUR — Euro (EDDF)</option>
                            <option value="SGD">
                              SGD — Singapore Dollar (WSSS)
                            </option>
                            <option value="BRL">
                              BRL — Brazilian Real (SBGR)
                            </option>
                            <option value="GBP">
                              GBP — British Pound (EGLL)
                            </option>
                            <option value="USD">USD — US Dollar</option>
                            <option value="KZT">
                              KZT — Kazakhstani Tenge (Unsupported on XRPL)
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Payment Method / Rail Adapter
                          </label>
                          <select
                            aria-label="Payment Method / Rail Adapter"
                            value={payRail}
                            onChange={(e) =>
                              setPayRail(e.target.value as SettlementRail)
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-blue-700"
                          >
                            <option value="XRPL_BRIDGE">
                              XRPL Bridge (XRP ODL + Local Off-Ramp)
                            </option>
                            <option value="RLUSD_STABLECOIN">
                              RLUSD Regulated Stablecoin Rail
                            </option>
                            <option value="SWIFT_GPI">
                              SWIFT gpi International Wire
                            </option>
                            <option value="SEPA_INSTANT">
                              SEPA Instant (EUR Corridor)
                            </option>
                            <option value="FEDWIRE">
                              Fedwire (USD Domestic)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Aircraft Tail Number
                          </label>
                          <input
                            type="text"
                            value={payTailNumber}
                            onChange={(e) => setPayTailNumber(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Airport Station (ICAO)
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            value={payAirportIcao}
                            onChange={(e) =>
                              setPayAirportIcao(e.target.value.toUpperCase())
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Payment Reference & Aviation Memo (Encoded into XRPL
                          Hex MemoData)
                        </label>
                        <input
                          type="text"
                          value={payMemo}
                          onChange={(e) => setPayMemo(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          disabled={submittingPayment}
                          onClick={() =>
                            handleExecuteCreatePayment({ saveAsDraft: true })
                          }
                          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentWizardStep("REVIEW")}
                          className="px-5 py-2.5 rounded-lg bg-[#0a1929] text-white hover:bg-slate-800 font-semibold transition"
                        >
                          Review Transaction Details →
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STEP 2: PAYMENT REVIEW & SUBMISSION */
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-bold text-slate-900 text-sm">
                            Pre-Submission Settlement Review
                          </span>
                          <span className="font-mono text-blue-700 font-semibold">
                            Rail: {payRail}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <span className="text-slate-500 block">
                              Source Debit
                            </span>
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {formatDecimalCurrency(
                                payAmount,
                                paySourceCurrency
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              Estimated Beneficiary Credit
                            </span>
                            <span className="font-mono text-sm font-bold text-blue-700">
                              {liveQuote
                                ? formatDecimalCurrency(
                                    liveQuote.destinationAmount,
                                    payDestCurrency
                                  )
                                : "Calculating..."}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              Total Network + Platform Fee
                            </span>
                            <span className="font-mono font-semibold text-slate-900">
                              ${liveQuote?.totalFeeUsd || "15.01"} USD
                            </span>
                          </div>
                        </div>

                        {liveQuote?.bridgeXrpUnits && (
                          <div className="p-3 rounded bg-blue-50/70 border border-blue-200 text-blue-950 font-mono">
                            XRPL Bridge Path: {paySourceCurrency} →{" "}
                            <strong>{liveQuote.bridgeXrpUnits} XRP</strong>{" "}
                            (12 drops fee) → {payDestCurrency} via{" "}
                            {liveQuote.offRampPartner}
                          </div>
                        )}

                        <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900">
                          <strong>Dual-Control Policy Check:</strong>{" "}
                          {Number(payAmount) >=
                          Number(data.company.dualControlThresholdUsd)
                            ? `Amount exceeds $${Number(
                                data.company.dualControlThresholdUsd
                              ).toLocaleString()} USD threshold. You may queue for dual-control approval or, if authorized (${
                                data.activeUser.role
                              }), execute immediate settlement.`
                            : "Within single-operator authorization limit."}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setPaymentWizardStep("FORM")}
                          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                        >
                          ← Back to Edit
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={submittingPayment}
                            onClick={() =>
                              handleExecuteCreatePayment({
                                forceImmediateAuthorizedExecution: false,
                              })
                            }
                            className="px-4 py-2.5 rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold"
                          >
                            Submit to Approval Queue
                          </button>
                          <button
                            type="button"
                            disabled={submittingPayment}
                            onClick={() =>
                              handleExecuteCreatePayment({
                                forceImmediateAuthorizedExecution: true,
                              })
                            }
                            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-sm"
                          >
                            {submittingPayment
                              ? "Executing Settlement..."
                              : "Authorize & Settle Immediately"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Live Exchange Rate & XRPL Corridor Quote Card */}
                <div className="bg-[#0a1929] text-white rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-blue-400 font-semibold">
                        Real-Time FX & XRPL Quote Engine
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                        {liveQuote?.quoteReference || "LIVE"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold mt-2">
                      {paySourceCurrency} → {payDestCurrency} Conversion Quote
                    </h3>

                    {liveQuote ? (
                      <div className="mt-4 space-y-3 text-xs">
                        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Mid-Market FX Rate
                            </span>
                            <span className="font-mono">
                              1 {paySourceCurrency} = {liveQuote.midMarketRate}{" "}
                              {payDestCurrency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Applied Corridor Rate ({liveQuote.corridorSpreadBps}{" "}
                              bps)
                            </span>
                            <span className="font-mono font-bold text-blue-400">
                              1 {paySourceCurrency} = {liveQuote.appliedRate}{" "}
                              {payDestCurrency}
                            </span>
                          </div>
                          {liveQuote.bridgeXrpUnits && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                XRP Bridge Liquidity Leg
                              </span>
                              <span className="font-mono text-emerald-400">
                                {liveQuote.bridgeXrpUnits} XRP
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Total Estimated Fee
                            </span>
                            <span className="font-mono">
                              ${liveQuote.totalFeeUsd} USD
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Estimated Settlement Time
                            </span>
                            <span className="font-mono font-semibold text-emerald-400">
                              {liveQuote.estimatedTimeSec < 120
                                ? `~${liveQuote.estimatedTimeSec} seconds`
                                : `~${Math.round(liveQuote.estimatedTimeSec / 3600)} hours`}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
                          <strong className="text-white block mb-0.5">
                            Downstream Clearing Partner:
                          </strong>
                          {liveQuote.offRampPartner}
                          <p className="text-slate-400 mt-1">
                            {liveQuote.corridorNotes}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-4">
                        Enter an amount to retrieve a live corridor quote.
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                    Execution Mode:{" "}
                    <strong className="text-amber-300">
                      {data.xrplNetworkMode}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Payment Statuses & Approval Queue Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Payment Lifecycle Tracker & Dual-Control Approval Queue
                    </h3>
                    <p className="text-xs text-slate-500">
                      Supports statuses: Draft, Awaiting Approval, Processing,
                      Pending Settlement, Completed, Failed, Cancelled.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4">Payment Ref</th>
                        <th className="py-3 px-4">Beneficiary & Hub</th>
                        <th className="py-3 px-4">Source → Destination</th>
                        <th className="py-3 px-4">Rail & Classification</th>
                        <th className="py-3 px-4">Payment Status</th>
                        <th className="py-3 px-4 text-right">
                          Workflow Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-4 px-4">
                            <div className="font-mono font-bold text-slate-900">
                              {p.paymentReference}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Tail: {p.aircraftTailNumber || "N/A"} • Inv:{" "}
                              {p.invoiceNumber || "Direct"}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-slate-900">
                              {p.beneficiaryName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {p.airportIcao} ({p.beneficiaryCountry})
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono">
                            <div className="font-bold text-slate-900">
                              {formatDecimalCurrency(
                                p.destinationAmount,
                                p.destinationCurrency
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              from{" "}
                              {formatDecimalCurrency(
                                p.sourceAmount,
                                p.sourceCurrency
                              )}{" "}
                              @ {p.exchangeRate}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-mono font-semibold text-blue-700 mb-1">
                              {p.settlementRail}
                            </div>
                            <ExecutionClassificationBadge
                              classification={p.executionClassification}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold ${
                                p.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : p.status === "AWAITING_APPROVAL"
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : p.status === "PENDING_SETTLEMENT"
                                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                                      : p.status === "CANCELLED" ||
                                          p.status === "FAILED"
                                        ? "bg-red-50 text-red-800 border border-red-200"
                                        : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                            {p.status === "AWAITING_APPROVAL" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleApproveOrRejectPayment(
                                      p.id,
                                      "APPROVED"
                                    )
                                  }
                                  className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                                >
                                  Approve & Settle
                                </button>
                                <button
                                  onClick={() =>
                                    handleApproveOrRejectPayment(
                                      p.id,
                                      "REJECTED"
                                    )
                                  }
                                  className="px-2.5 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 font-semibold"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {p.status === "PENDING_SETTLEMENT" && (
                              <button
                                onClick={() =>
                                  handleCompletePendingSettlement(p.id)
                                }
                                className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                              >
                                Confirm Off-Ramp
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedConfirmationPayment(p)}
                              className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold"
                            >
                              Confirmation Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION C: INTERNATIONAL SETTLEMENT
          ========================================================= */}
          {activeTab === "settlement" && (
            <InternationalSettlementView
              corridors={data.corridors}
              xrplNetworkMode={data.xrplNetworkMode}
              wallets={data.wallets}
              onSwitchNetwork={async (mode) => {
                await fetch("/api/platform", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "SWITCH_XRPL_NETWORK",
                    networkMode: mode,
                  }),
                });
                await fetchPlatformData();
                showToast(`Switched XRPL service layer to ${mode}.`, "info");
              }}
              onLaunchCorridorPayment={handleLaunchCorridorPayment}
            />
          )}

          {/* =========================================================
              SECTION D: BENEFICIARIES AND SUPPLIERS
          ========================================================= */}
          {activeTab === "beneficiaries" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    International Aviation Beneficiaries & Verified Suppliers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage fuel uplift providers, EASA/FAA MRO facilities, AOG
                    parts distributors, and ground handling counterparties.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search supplier, ICAO, country..."
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                    />
                  </div>
                  <select
                    aria-label="Filter Suppliers by Category"
                    value={supplierCategoryFilter}
                    onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                  >
                    <option value="ALL">All Aviation Categories</option>
                    <option value="FUEL_SUPPLIER">Aviation Fuel Suppliers</option>
                    <option value="MRO_FACILITY">MRO Overhaul Facilities</option>
                    <option value="PARTS_DISTRIBUTOR">
                      Aircraft Parts Distributors
                    </option>
                    <option value="GROUND_HANDLING">
                      Airport Ground Handling
                    </option>
                    <option value="AIRCRAFT_LEASING">Aircraft Lessors</option>
                  </select>
                  <button
                    onClick={() => setShowAddSupplierModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a1929] text-white font-semibold hover:bg-slate-800 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Aviation Beneficiary
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.beneficiaries
                  .filter((b) => {
                    if (
                      supplierCategoryFilter !== "ALL" &&
                      b.category !== supplierCategoryFilter
                    )
                      return false;
                    if (supplierSearch.trim()) {
                      const q = supplierSearch.toLowerCase();
                      return (
                        b.tradingName.toLowerCase().includes(q) ||
                        b.legalName.toLowerCase().includes(q) ||
                        b.countryName.toLowerCase().includes(q) ||
                        b.airportIcao.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((b) => (
                    <div
                      key={b.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-800">
                            {b.category.replace(/_/g, " ")} • {b.airportIcao}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              b.verificationStatus === "VERIFIED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {b.verificationStatus} • {b.sanctionsStatus}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mt-2">
                          {b.tradingName}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {b.legalName} — {b.city}, {b.countryName}
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              Settlement Currency
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {b.defaultCurrency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              Bank / IBAN
                            </span>
                            <span className="font-mono text-slate-700 truncate max-w-[180px]">
                              {b.ibanOrAccount}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              XRPL Destination
                            </span>
                            <span className="font-mono text-blue-700 truncate max-w-[180px]">
                              {b.xrplDestinationAddr || "Not Configured"}
                            </span>
                          </div>
                          {(b.supplierProfile.faaEasaCertNumber ||
                            b.supplierProfile.iataFuelCode) && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Aviation Cert / Code
                              </span>
                              <span className="font-mono text-slate-800">
                                {b.supplierProfile.faaEasaCertNumber ||
                                  b.supplierProfile.iataFuelCode}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              Lifetime Settled Volume
                            </span>
                            <span className="font-mono font-semibold text-slate-900">
                              {formatDecimalCurrency(
                                b.supplierProfile.lifetimeVolumeUsd,
                                "USD"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                        <button
                          onClick={() => setSelectedBeneficiaryDetail(b)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          Profile & History
                        </button>
                        <button
                          onClick={() => {
                            handleSelectBeneficiaryForPayment(b.id);
                            setActiveTab("payments");
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                        >
                          Pay Supplier →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Beneficiary Detail Drawer / Modal */}
              {selectedBeneficiaryDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
                  <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {selectedBeneficiaryDetail.tradingName}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {selectedBeneficiaryDetail.legalName} •{" "}
                          {selectedBeneficiaryDetail.city},{" "}
                          {selectedBeneficiaryDetail.countryName} (
                          {selectedBeneficiaryDetail.airportIcao})
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedBeneficiaryDetail(null)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                      >
                        Close ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">
                          Bank & SWIFT BIC
                        </span>
                        <span className="font-semibold text-slate-900">
                          {selectedBeneficiaryDetail.bankName} (
                          {selectedBeneficiaryDetail.swiftBic})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">
                          Account / IBAN
                        </span>
                        <span className="font-mono font-semibold text-slate-900">
                          {selectedBeneficiaryDetail.ibanOrAccount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">
                          XRPL Address & Destination Tag
                        </span>
                        <span className="font-mono text-blue-700">
                          {selectedBeneficiaryDetail.xrplDestinationAddr ||
                            "None"}{" "}
                          (Tag:{" "}
                          {selectedBeneficiaryDetail.xrplDestinationTag ||
                            "N/A"}
                          )
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">
                          Contact Treasury Desk
                        </span>
                        <span className="font-semibold text-slate-900">
                          {selectedBeneficiaryDetail.contactName} •{" "}
                          {selectedBeneficiaryDetail.contactEmail}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <h4 className="font-bold text-slate-800 mb-2">
                        Supplier Settlement History
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {data.payments
                          .filter(
                            (p) =>
                              p.beneficiaryId === selectedBeneficiaryDetail.id
                          )
                          .map((p) => (
                            <div
                              key={p.id}
                              className="p-2.5 rounded border border-slate-200 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-mono font-bold">
                                  {p.paymentReference}
                                </span>{" "}
                                — {p.memoText}
                              </div>
                              <span className="font-mono font-semibold text-blue-700">
                                {formatDecimalCurrency(
                                  p.destinationAmount,
                                  p.destinationCurrency
                                )}{" "}
                                ({p.status})
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Supplier Modal */}
              {showAddSupplierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
                  <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      Onboard International Aviation Supplier
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Includes automated OFAC/EU sanctions screening & XRPL
                      classic r-address validation.
                    </p>
                    <form
                      onSubmit={handleAddBeneficiary}
                      className="space-y-3 text-xs"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">
                            Legal Corporate Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Zurich AeroTechnik AG"
                            value={newSupLegalName}
                            onChange={(e) => setNewSupLegalName(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">
                            Trading Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Zurich MRO Services"
                            value={newSupTradingName}
                            onChange={(e) =>
                              setNewSupTradingName(e.target.value)
                            }
                            className="w-full px-3 py-2 rounded border border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">
                            Airport ICAO
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={4}
                            value={newSupIcao}
                            onChange={(e) =>
                              setNewSupIcao(e.target.value.toUpperCase())
                            }
                            className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">
                            Category
                          </label>
                          <select
                            aria-label="Supplier Category"
                            value={newSupCategory}
                            onChange={(e) =>
                              setNewSupCategory(
                                e.target.value as AviationCategory
                              )
                            }
                            className="w-full px-2 py-2 rounded border border-slate-300 bg-white"
                          >
                            <option value="FUEL_SUPPLIER">Fuel Supplier</option>
                            <option value="MRO_FACILITY">MRO Facility</option>
                            <option value="PARTS_DISTRIBUTOR">
                              Parts Distributor
                            </option>
                            <option value="GROUND_HANDLING">
                              Ground Handling
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">
                            Currency
                          </label>
                          <select
                            aria-label="Supplier Default Currency"
                            value={newSupCurrency}
                            onChange={(e) => setNewSupCurrency(e.target.value)}
                            className="w-full px-2 py-2 rounded border border-slate-300 bg-white font-mono"
                          >
                            <option value="AED">AED</option>
                            <option value="EUR">EUR</option>
                            <option value="SGD">SGD</option>
                            <option value="BRL">BRL</option>
                            <option value="GBP">GBP</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">
                            Country Name
                          </label>
                          <input
                            type="text"
                            required
                            value={newSupCountryName}
                            onChange={(e) =>
                              setNewSupCountryName(e.target.value)
                            }
                            className="w-full px-3 py-2 rounded border border-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            required
                            value={newSupCity}
                            onChange={(e) => setNewSupCity(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-slate-300"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">
                          XRPL Destination Classic Address (Optional)
                        </label>
                        <input
                          type="text"
                          value={newSupXrplAddr}
                          onChange={(e) => setNewSupXrplAddr(e.target.value)}
                          className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowAddSupplierModal(false)}
                          className="px-4 py-2 rounded border border-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold"
                        >
                          Verify & Save Supplier
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              SECTION E: INVOICES
          ========================================================= */}
          {activeTab === "invoices" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Aviation Supplier Invoices & 3-Way Reconciliation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create invoices, verify line-item fuel uplift & MRO work
                    orders, and match directly to XRPL or bank settlements.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {["ALL", "OUTSTANDING", "OVERDUE", "PENDING_APPROVAL", "PAID"].map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setInvoiceStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                          invoiceStatusFilter === st
                            ? "bg-[#0a1929] text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {st.replace(/_/g, " ")}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setShowCreateInvoiceModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create / Upload Invoice
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {data.invoices
                  .filter(
                    (i) =>
                      invoiceStatusFilter === "ALL" ||
                      i.status === invoiceStatusFilter
                  )
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-slate-900">
                              {inv.invoiceNumber}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                inv.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : inv.status === "OVERDUE"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {inv.status}
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              Station: {inv.airportIcao} • Aircraft:{" "}
                              {inv.aircraftTailNumber}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Supplier: <strong>{inv.beneficiaryName}</strong> (
                            {inv.beneficiaryCountry}) • Due: {inv.dueDate} •
                            Document: <span className="font-mono">{inv.documentFileName}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-bold font-mono text-slate-900">
                              {formatDecimalCurrency(
                                inv.totalAmount,
                                inv.currency
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-500">
                              USD Eq: ${Number(inv.usdEquivalent).toLocaleString()}
                            </div>
                          </div>

                          {inv.status !== "PAID" ? (
                            <button
                              onClick={() => handleLaunchPayInvoice(inv)}
                              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                            >
                              Pay & Reconcile →
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-semibold">
                              Matched ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Line Items Table */}
                      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                              <th className="py-2 px-3">Part / SKU</th>
                              <th className="py-2 px-3">Line Item Description</th>
                              <th className="py-2 px-3 text-right">Quantity</th>
                              <th className="py-2 px-3 text-right">Unit Price</th>
                              <th className="py-2 px-3 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {inv.lineItems.map((li) => (
                              <tr key={li.id}>
                                <td className="py-2 px-3 font-mono text-slate-700">
                                  {li.skuOrPartNum || "AV-ITEM"}
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-900">
                                  {li.description}
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                  {Number(li.quantity).toLocaleString()} {li.unit}
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                  {li.unitPrice} {inv.currency}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                  {formatDecimalCurrency(
                                    li.lineTotal,
                                    inv.currency
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Create Invoice Modal */}
              {showCreateInvoiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
                  <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      Create & Upload Aviation Supplier Invoice
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Computes exact fixed-point decimal totals and SHA-256
                      document integrity hash.
                    </p>
                    <form
                      onSubmit={handleCreateInvoice}
                      className="space-y-3 text-xs"
                    >
                      <div>
                        <label className="block font-semibold mb-1">
                          Assign Supplier Beneficiary
                        </label>
                        <select
                          aria-label="Assign Supplier Beneficiary"
                          value={invBeneficiaryId}
                          onChange={(e) => {
                            setInvBeneficiaryId(e.target.value);
                            const b = data.beneficiaries.find(
                              (x) => x.id === e.target.value
                            );
                            if (b) setInvCurrency(b.defaultCurrency);
                          }}
                          className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                        >
                          {data.beneficiaries.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.tradingName} ({b.defaultCurrency})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">
                            Invoice Number
                          </label>
                          <input
                            type="text"
                            required
                            value={invNumber}
                            onChange={(e) => setInvNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">
                            Currency
                          </label>
                          <input
                            type="text"
                            required
                            value={invCurrency}
                            onChange={(e) =>
                              setInvCurrency(e.target.value.toUpperCase())
                            }
                            className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            required
                            value={invDueDate}
                            onChange={(e) => setInvDueDate(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">
                            Aircraft Tail Number
                          </label>
                          <input
                            type="text"
                            value={invTailNumber}
                            onChange={(e) => setInvTailNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">
                            Uploaded PDF Document Filename
                          </label>
                          <input
                            type="text"
                            value={invDocName}
                            onChange={(e) => setInvDocName(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                          />
                        </div>
                      </div>
                      <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
                        <div className="font-bold text-slate-800">
                          Line Item #1
                        </div>
                        <input
                          type="text"
                          required
                          value={invLineDesc}
                          onChange={(e) => setInvLineDesc(e.target.value)}
                          placeholder="Line Item Description"
                          className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            required
                            value={invLineQty}
                            onChange={(e) => setInvLineQty(e.target.value)}
                            placeholder="Qty"
                            className="px-2 py-1.5 rounded border border-slate-300 bg-white font-mono"
                          />
                          <input
                            type="text"
                            required
                            value={invLineUnit}
                            onChange={(e) => setInvLineUnit(e.target.value)}
                            placeholder="Unit"
                            className="px-2 py-1.5 rounded border border-slate-300 bg-white font-mono"
                          />
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={invLinePrice}
                            onChange={(e) => setInvLinePrice(e.target.value)}
                            placeholder="Unit Price"
                            className="px-2 py-1.5 rounded border border-slate-300 bg-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateInvoiceModal(false)}
                          className="px-4 py-2 rounded border border-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold"
                        >
                          Register Invoice
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              SECTION F: TREASURY
          ========================================================= */}
          {activeTab === "treasury" && (
            <TreasuryOverviewView
              accounts={data.treasuryAccounts}
              wallets={data.wallets}
              totalTreasuryUsd={data.kpis.totalTreasuryUsd}
              xrplNetworkMode={data.xrplNetworkMode}
            />
          )}

          {/* =========================================================
              SECTION G: TRANSACTION HISTORY
          ========================================================= */}
          {activeTab === "transactions" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Searchable Aviation Transaction Ledger
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Immutable settlement records with XRPL simulation traces,
                      on-chain hashes, FX rates, and downloadable audit reports.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const headers = [
                        "TxRef",
                        "PaymentRef",
                        "Recipient",
                        "Country",
                        "SourceAmount",
                        "SourceCurr",
                        "DestAmount",
                        "DestCurr",
                        "FXRate",
                        "FeeUSD",
                        "Rail",
                        "Classification",
                        "XRPLHashOrSimTrace",
                        "Timestamp",
                      ];
                      const rows = filteredTransactions.map((t) => [
                        t.transactionReference,
                        t.paymentReference,
                        `"${t.recipientName}"`,
                        `"${t.recipientCountry}"`,
                        t.sourceAmount,
                        t.sourceCurrency,
                        t.destinationAmount,
                        t.destinationCurrency,
                        t.exchangeRate,
                        t.feeAmountUsd,
                        t.settlementRail,
                        t.executionClassification,
                        t.xrplTxHash ||
                          t.simulationTraceId ||
                          t.externalBankRef ||
                          "N/A",
                        t.createdAt,
                      ]);
                      const csv = [
                        headers.join(","),
                        ...rows.map((r) => r.join(",")),
                      ].join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "AeroSettle_Filtered_Transactions.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0a1929] text-white text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download Filtered Ledger (CSV)
                  </button>
                </div>

                {/* Multi-Dimension Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-2">
                  <input
                    type="text"
                    placeholder="Search ref, beneficiary, ICAO..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                  <select
                    aria-label="Filter by Destination Currency"
                    value={txCurrencyFilter}
                    onChange={(e) => setTxCurrencyFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="ALL">All Currencies</option>
                    <option value="AED">AED (UAE)</option>
                    <option value="EUR">EUR (Eurozone)</option>
                    <option value="SGD">SGD (Singapore)</option>
                    <option value="BRL">BRL (Brazil)</option>
                    <option value="GBP">GBP (UK)</option>
                  </select>
                  <select
                    aria-label="Filter by Country"
                    value={txCountryFilter}
                    onChange={(e) => setTxCountryFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="ALL">All Countries</option>
                    <option value="United Arab Emirates">
                      United Arab Emirates
                    </option>
                    <option value="Germany">Germany</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Brazil">Brazil</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                  <select
                    aria-label="Filter by Payment Method"
                    value={txRailFilter}
                    onChange={(e) => setTxRailFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="ALL">All Payment Rails</option>
                    <option value="XRPL_BRIDGE">XRPL Bridge</option>
                    <option value="RLUSD_STABLECOIN">RLUSD Stablecoin</option>
                    <option value="SWIFT_GPI">SWIFT gpi</option>
                  </select>
                  <select
                    aria-label="Filter by Status"
                    value={txStatusFilter}
                    onChange={(e) => setTxStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING_SETTLEMENT">
                      Pending Settlement
                    </option>
                  </select>
                  <input
                    type="number"
                    placeholder="Min Amount (USD)"
                    value={txMinAmount}
                    onChange={(e) => setTxMinAmount(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4">Tx Reference & Date</th>
                        <th className="py-3 px-4">Sender → Recipient</th>
                        <th className="py-3 px-4">Amounts & FX Rate</th>
                        <th className="py-3 px-4">Payment Rail & Fee</th>
                        <th className="py-3 px-4">
                          XRPL Hash / Simulation Trace
                        </th>
                        <th className="py-3 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredTransactions.map((t) => {
                        const linkedPayment = data.payments.find(
                          (p) => p.id === t.paymentId
                        );
                        return (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="py-4 px-4">
                              <div className="font-mono font-bold text-slate-900">
                                {t.transactionReference}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {new Date(t.createdAt).toLocaleString()}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-semibold text-slate-900">
                                {t.recipientName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {t.recipientCountry} • Station: {t.airportIcao}{" "}
                                • Inv: {t.invoiceNumber || "Direct"}
                              </div>
                            </td>
                            <td className="py-4 px-4 font-mono">
                              <div className="font-bold text-slate-900">
                                {formatDecimalCurrency(
                                  t.destinationAmount,
                                  t.destinationCurrency
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {formatDecimalCurrency(
                                  t.sourceAmount,
                                  t.sourceCurrency
                                )}{" "}
                                @ {t.exchangeRate}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-mono font-semibold text-blue-700">
                                {t.settlementRail} (${t.feeAmountUsd} fee)
                              </div>
                              <div className="mt-1">
                                <ExecutionClassificationBadge
                                  classification={t.executionClassification}
                                />
                              </div>
                            </td>
                            <td className="py-4 px-4 font-mono text-[11px]">
                              {t.xrplTxHash ? (
                                <span className="text-emerald-700 font-semibold">
                                  On-Chain: {t.xrplTxHash.slice(0, 16)}...
                                </span>
                              ) : t.simulationTraceId ? (
                                <span className="text-amber-800">
                                  Sim Trace: {t.simulationTraceId}
                                </span>
                              ) : (
                                <span className="text-slate-600">
                                  Ref: {t.externalBankRef || "N/A"}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {linkedPayment && (
                                <button
                                  onClick={() =>
                                    setSelectedConfirmationPayment(
                                      linkedPayment
                                    )
                                  }
                                  className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold"
                                >
                                  Inspect Record
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION H: ANALYTICS AND REPORTING
          ========================================================= */}
          {activeTab === "analytics" && (
            <AnalyticsAndReportingView
              payments={data.payments}
              transactions={data.transactions}
              beneficiaries={data.beneficiaries}
              invoices={data.invoices}
            />
          )}

          {/* =========================================================
              SECTION I: SETTINGS AND COMPANY MANAGEMENT
          ========================================================= */}
          {activeTab === "settings" && (
            <SettingsAndCompanyView
              company={data.company}
              users={data.users}
              activeUser={data.activeUser}
              rolePermissions={data.rolePermissions}
              auditLogs={data.auditLogs}
              onSwitchUser={async (userId) => {
                await fetch("/api/platform", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "SWITCH_ROLE_USER",
                    userId,
                  }),
                });
                await fetchPlatformData();
                showToast("Switched active RBAC user session.", "info");
              }}
              onUpdateSettings={async (payload) => {
                const res = await fetch("/api/platform", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "UPDATE_COMPANY_SETTINGS",
                    ...payload,
                  }),
                });
                const json = await res.json();
                if (!res.ok) {
                  throw new Error(json.error || "Failed to update settings");
                }
                await fetchPlatformData();
              }}
            />
          )}
        </main>
      </div>

      {/* Detailed Payment Confirmation & XRPL Inspector Modal */}
      <PaymentConfirmationModal
        payment={selectedConfirmationPayment}
        onClose={() => setSelectedConfirmationPayment(null)}
      />

      {/* Entity Onboarding & Enterprise MFA Login Modal */}
      <OnboardingAndAuthModal
        isOpen={isAuthOnboardingOpen}
        onClose={() => setIsAuthOnboardingOpen(false)}
        company={data.company}
        onSaveOnboarding={async (payload) => {
          await fetch("/api/platform", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "UPDATE_COMPANY_SETTINGS",
              ...payload,
            }),
          });
          await fetchPlatformData();
        }}
      />
    </div>
  );
}
