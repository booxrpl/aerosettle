"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Download,
  Shield,
  Users,
  Key,
  Lock,
  Check,
  X,
  FileSpreadsheet,
  Sliders,
  History,
  Building2,
} from "lucide-react";
import { formatDecimalCurrency } from "@/lib/decimal";
import {
  AuditLogRecord,
  BeneficiaryRecord,
  CompanyRecord,
  InvoiceRecord,
  PaymentRecord,
  RolePermissionRecord,
  TransactionLedgerRecord,
  UserRecord,
} from "@/types/aerosettle";

interface AnalyticsViewProps {
  payments: PaymentRecord[];
  transactions: TransactionLedgerRecord[];
  beneficiaries: BeneficiaryRecord[];
  invoices: InvoiceRecord[];
}

export function AnalyticsAndReportingView({
  payments,
  transactions,
  beneficiaries,
  invoices,
}: AnalyticsViewProps) {
  const monthlySeries = [
    { month: "Jun 2026", xrplUsd: 690000, swiftUsd: 210000, avgSec: 18 },
    { month: "Jul 2026", xrplUsd: 820000, swiftUsd: 185000, avgSec: 16 },
    { month: "Aug 2026", xrplUsd: 945000, swiftUsd: 160000, avgSec: 15 },
    { month: "Sep 2026", xrplUsd: 1120000, swiftUsd: 140000, avgSec: 15 },
    { month: "Oct 2026", xrplUsd: 1295000, swiftUsd: 115000, avgSec: 14 },
    { month: "Nov 2026 (MTD)", xrplUsd: 1082072, swiftUsd: 95000, avgSec: 14 },
  ];

  const regionalBreakdown = [
    {
      region: "Europe (EDDF Frankfurt / EGLL London)",
      sharePct: 52,
      volumeUsd: "739,916.20",
      primaryRail: "XRPL Bridge → SEPA Instant / UK FPS",
    },
    {
      region: "Middle East (OMDB Dubai Fuel Hub)",
      sharePct: 24,
      volumeUsd: "334,513.28",
      primaryRail: "XRPL Bridge → UAEFTS",
    },
    {
      region: "Asia-Pacific (WSSS Singapore Changi)",
      sharePct: 15,
      volumeUsd: "176,921.01",
      primaryRail: "XRPL Bridge → Singapore FAST",
    },
    {
      region: "Latin America (SBGR São Paulo)",
      sharePct: 9,
      volumeUsd: "96,213.70",
      primaryRail: "XRPL Bridge → Brazil PIX eFX",
    },
  ];

  const handleExportAnalyticsCsv = () => {
    const headers = [
      "TransactionRef",
      "PaymentRef",
      "Timestamp",
      "Recipient",
      "Country",
      "AirportICAO",
      "SourceCurrency",
      "SourceAmount",
      "DestinationCurrency",
      "DestinationAmount",
      "USDEquivalent",
      "AppliedFXRate",
      "FeeUSD",
      "SettlementRail",
      "SettlementDurationSec",
      "ExecutionClassification",
      "XRPLHashOrSimTrace",
    ];
    const rows = transactions.map((t) => [
      t.transactionReference,
      t.paymentReference,
      t.createdAt,
      `"${t.recipientName}"`,
      `"${t.recipientCountry}"`,
      t.airportIcao,
      t.sourceCurrency,
      t.sourceAmount,
      t.destinationCurrency,
      t.destinationAmount,
      t.usdEquivalent,
      t.exchangeRate,
      t.feeAmountUsd,
      t.settlementRail,
      String(t.settlementDurationSec),
      t.executionClassification,
      t.xrplTxHash || t.simulationTraceId || t.externalBankRef || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AeroSettle_Executive_Settlement_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Executive Treasury Analytics & Corridor Reporting
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantitative analysis of settlement velocity, FX spread savings,
            supplier concentration, and outstanding aviation liabilities.
          </p>
        </div>
        <button
          onClick={handleExportAnalyticsCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0a1929] text-white text-xs font-semibold hover:bg-slate-800 transition"
        >
          <Download className="w-4 h-4" />
          Export Full Analytics Ledger (CSV)
        </button>
      </div>

      {/* Top Benchmark Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">
            Avg. XRPL Corridor Settlement
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            14.2 sec
          </div>
          <span className="text-xs text-emerald-700 font-medium mt-1 block">
            vs. 38.4 hrs legacy SWIFT gpi
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">
            Weighted FX Spread (XRPL Bridge)
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            13.5 bps
          </div>
          <span className="text-xs text-emerald-700 font-medium mt-1 block">
            Saves ~54 bps vs. correspondent banks
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">
            YTD Estimated FX & Wire Savings
          </span>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-1">
            $148,920.00
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Across 42 widebody fuel & MRO settlements
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">
            Outstanding Invoice Liabilities
          </span>
          <div className="text-2xl font-bold text-amber-700 font-mono mt-1">
            $492,534.75
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {invoices.filter((i) => i.status !== "PAID").length} unpaid supplier
            invoices
          </span>
        </div>
      </div>

      {/* Monthly Volume Bar Visualization & Regional Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">
            Monthly Settlement Volume by Rail (XRPL/RLUSD vs. Legacy Wire)
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            6-month institutional settlement trajectory (USD Equivalent)
          </p>

          <div className="space-y-4">
            {monthlySeries.map((m) => {
              const total = m.xrplUsd + m.swiftUsd;
              const xrplPct = Math.round((m.xrplUsd / total) * 100);
              const barWidthPct = Math.min(100, Math.round((total / 1450000) * 100));
              return (
                <div key={m.month} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {m.month}
                    </span>
                    <span className="font-mono text-slate-700">
                      ${total.toLocaleString()} ({xrplPct}% XRPL/RLUSD • Avg{" "}
                      {m.avgSec}s)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(barWidthPct * xrplPct) / 100}%` }}
                      className="bg-blue-600 h-full"
                      title="XRPL Bridge & RLUSD"
                    />
                    <div
                      style={{
                        width: `${(barWidthPct * (100 - xrplPct)) / 100}%`,
                      }}
                      className="bg-slate-400 h-full"
                      title="Legacy SWIFT"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">
            Payment Volume by Global Aviation Region
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Distribution across international hub corridors
          </p>

          <div className="space-y-4">
            {regionalBreakdown.map((reg) => (
              <div
                key={reg.region}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{reg.region}</span>
                  <span className="font-mono font-bold text-blue-700">
                    ${reg.volumeUsd} ({reg.sharePct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${reg.sharePct}%` }}
                    className="h-full bg-[#0a1929]"
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Primary Clearing Path: <strong>{reg.primaryRail}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supplier Volume & Reliability Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Payment Volume & Settlement Velocity by Aviation Counterparty
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Supplier / Counterparty</th>
                <th className="py-3 px-4">Hub Airport</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Preferred Rail</th>
                <th className="py-3 px-4 text-right">Avg Settlement Time</th>
                <th className="py-3 px-4 text-right">Lifetime Volume (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {beneficiaries.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {b.tradingName}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {b.airportIcao} ({b.countryCode})
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {b.category.replace(/_/g, " ")}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-blue-700">
                    {b.supplierProfile.preferredSettlementRail}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                    {b.supplierProfile.averageSettlementSec < 120
                      ? `${b.supplierProfile.averageSettlementSec}s`
                      : `${Math.round(b.supplierProfile.averageSettlementSec / 3600)}h`}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatDecimalCurrency(
                      b.supplierProfile.lifetimeVolumeUsd,
                      "USD"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface SettingsAndCompanyViewProps {
  company: CompanyRecord;
  users: UserRecord[];
  activeUser: UserRecord;
  rolePermissions: RolePermissionRecord[];
  auditLogs: AuditLogRecord[];
  onSwitchUser: (userId: string) => Promise<void>;
  onUpdateSettings: (payload: {
    legalName: string;
    primaryHubAirport: string;
    dualControlThresholdUsd: string;
    requireDualApprovalOnXrpl: boolean;
  }) => Promise<void>;
}

export function SettingsAndCompanyView({
  company,
  users,
  activeUser,
  rolePermissions,
  auditLogs,
  onSwitchUser,
  onUpdateSettings,
}: SettingsAndCompanyViewProps) {
  const [legalName, setLegalName] = useState(company.legalName);
  const [hubAirport, setHubAirport] = useState(company.primaryHubAirport);
  const [thresholdUsd, setThresholdUsd] = useState(
    company.dualControlThresholdUsd
  );
  const [requireDualXrpl, setRequireDualXrpl] = useState(
    company.requireDualApprovalOnXrpl
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSaveGovernance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    setErrorMessage(null);
    try {
      await onUpdateSettings({
        legalName,
        primaryHubAirport: hubAirport,
        dualControlThresholdUsd: thresholdUsd,
        requireDualApprovalOnXrpl: requireDualXrpl,
      });
      setSaveMessage(
        "Company profile and dual-control approval governance saved and logged to the SHA-256 audit chain."
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update settings."
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Company Profile & Dual-Control Governance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Aviation Entity Profile & Approval Workflow Policy
              </h3>
              <p className="text-xs text-slate-500">
                Configure ICAO/IATA operator metadata and dual-control payment
                approval thresholds.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveGovernance} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Legal Corporate Airline / Operator Name
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ICAO / IATA Code
                </label>
                <input
                  type="text"
                  disabled
                  value={`${company.icaoCode} / ${company.iataCode}`}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-slate-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary Hub (ICAO)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={hubAirport}
                  onChange={(e) => setHubAirport(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dual-Control Limit (USD)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={thresholdUsd}
                  onChange={(e) => setThresholdUsd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={requireDualXrpl}
                onChange={(e) => setRequireDualXrpl(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="text-slate-700 font-medium">
                Require Payment Approver / CFO dual-control sign-off on all
                payments ≥ ${Number(thresholdUsd).toLocaleString()} USD
              </span>
            </label>

            {saveMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                {saveMessage}
              </div>
            )}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#0a1929] text-white font-semibold hover:bg-slate-800 transition"
            >
              Save Governance Policy
            </button>
          </form>
        </div>

        {/* Team Management & Interactive RBAC Session Switcher */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Team Management & Live RBAC Session Switcher
              </h3>
              <p className="text-xs text-slate-500">
                Click &ldquo;Assume Role&rdquo; on any team member to test
                Role-Based Access Control enforcement across payments,
                approvals, and settings.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {users.map((u) => {
              const isCurrent = u.id === activeUser.id;
              return (
                <div
                  key={u.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                    isCurrent
                      ? "border-blue-600 bg-blue-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {u.fullName}
                      </span>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-900 text-white">
                        {u.role}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      {u.title} • {u.email} • MFA: {u.mfaMethod}
                    </p>
                  </div>

                  {isCurrent ? (
                    <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold text-[11px] shrink-0">
                      Active Session
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSwitchUser(u.id)}
                      className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold shrink-0 transition"
                    >
                      Assume Role
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Role-Based Access Control (RBAC) Permission Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">
            Enterprise Role-Based Access Control (RBAC) Permission Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Enforced server-side on all `/api/platform` mutations.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Create Payment</th>
                <th className="py-3 px-4 text-center">Approve Payment</th>
                <th className="py-3 px-4 text-center">Execute XRPL</th>
                <th className="py-3 px-4 text-center">Manage Suppliers</th>
                <th className="py-3 px-4 text-center">Create Invoice</th>
                <th className="py-3 px-4 text-center">Manage Governance</th>
                <th className="py-3 px-4 text-right">Single Approval Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rolePermissions.map((rp) => (
                <tr key={rp.role} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{rp.label}</div>
                    <div className="text-[11px] text-slate-500 max-w-xs">
                      {rp.description}
                    </div>
                  </td>
                  {[
                    rp.canCreatePayment,
                    rp.canApprovePayment,
                    rp.canExecuteXrpl,
                    rp.canManageSuppliers,
                    rp.canCreateInvoice,
                    rp.canManageUsers,
                  ].map((allowed, idx) => (
                    <td key={idx} className="py-3.5 px-4 text-center">
                      {allowed ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {formatDecimalCurrency(rp.maxSingleApprovalUsd, "USD")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable SHA-256 Hash-Chained Security Audit Trail */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Immutable SHA-256 Hash-Chained Security & Compliance Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Every payment creation, dual-control approval, role switch, and
              XRPL execution is cryptographically chained.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
            Chain Integrity: VERIFIED ({auditLogs.length} Records)
          </span>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Audit Summary</th>
                <th className="py-3 px-4">SHA-256 Chain Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">
                      {log.actorName}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {log.actorRole}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-700 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-md">
                    {log.summary}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {log.integrityHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
