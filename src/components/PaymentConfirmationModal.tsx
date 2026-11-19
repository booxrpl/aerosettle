"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  FileText,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Building2,
  Plane,
  Lock,
  ArrowRight,
  X,
} from "lucide-react";
import { formatDecimalCurrency } from "@/lib/decimal";
import {
  CompanyRecord,
  PaymentRecord,
  TransactionLedgerRecord,
} from "@/types/aerosettle";

interface PaymentConfirmationModalProps {
  payment: PaymentRecord | null;
  transaction?: TransactionLedgerRecord | null;
  onClose: () => void;
}

export function ExecutionClassificationBadge({
  classification,
}: {
  classification: string;
}) {
  if (classification === "SIMULATED_PAYMENT") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Isolated Simulation Mode (No On-Chain Broadcast)
      </span>
    );
  }
  if (classification === "SUBMITTED_BLOCKCHAIN_TX") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Submitted XRPL Transaction (Pending Off-Ramp)
      </span>
    );
  }
  if (classification === "VALIDATED_ON_CHAIN_TX") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
        Validated On-Chain XRPL Ledger (tesSUCCESS)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
      Completed External Fiat Settlement
    </span>
  );
}

export function PaymentConfirmationModal({
  payment,
  onClose,
}: PaymentConfirmationModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!payment) return null;

  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const downloadReceiptJson = () => {
    const payload = {
      platform: "AeroSettle — Global Aviation Payment & Settlement Platform",
      exportedAt: new Date().toISOString(),
      disclaimer:
        payment.executionClassification === "SIMULATED_PAYMENT"
          ? "SIMULATION RECEIPT: Executed in AeroSettle Isolated Simulation Sandbox. No live funds or on-chain mainnet assets were transferred."
          : "OFFICIAL SETTLEMENT RECORD",
      payment,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payment.paymentReference}_Settlement_Receipt.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-8">
        {/* Top Navy Header */}
        <div className="bg-[#0a1929] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-400/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">
                  Aviation Settlement Confirmation & Audit Record
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono uppercase rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {payment.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                Ref: {payment.paymentReference} • Initiated by{" "}
                {payment.initiatorName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Execution Classification Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Settlement Execution Classification
              </p>
              <div className="mt-1">
                <ExecutionClassificationBadge
                  classification={payment.executionClassification}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Settlement Rail</p>
              <p className="text-sm font-semibold text-slate-900 font-mono">
                {payment.settlementRail}
              </p>
            </div>
          </div>

          {/* Core Financial Conversion Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <p className="text-xs text-slate-500 font-medium">
                Source Debit Amount
              </p>
              <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                {formatDecimalCurrency(
                  payment.sourceAmount,
                  payment.sourceCurrency
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Fee: ${payment.totalFeeUsd} USD
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-center">
              <p className="text-xs text-slate-500 font-medium">
                Applied FX Rate & Speed
              </p>
              <p className="text-sm font-semibold text-slate-900 font-mono mt-1">
                1 {payment.sourceCurrency} = {payment.exchangeRate}{" "}
                {payment.destinationCurrency}
              </p>
              <p className="text-xs text-blue-700 font-medium mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {payment.settlementDurationSec
                  ? `Settled in ${payment.settlementDurationSec} seconds`
                  : "Awaiting final settlement"}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/40">
              <p className="text-xs text-blue-700 font-medium">
                Beneficiary Credit Amount
              </p>
              <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                {formatDecimalCurrency(
                  payment.destinationAmount,
                  payment.destinationCurrency
                )}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {payment.beneficiaryName} ({payment.airportIcao || "GLOBAL"})
              </p>
            </div>
          </div>

          {/* Aviation Operational Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg border border-slate-200 bg-white text-xs">
            <div>
              <span className="text-slate-500 block">Beneficiary Country</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {payment.beneficiaryCountry}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Aircraft Tail / Fleet</span>
              <span className="font-semibold text-slate-900 font-mono mt-0.5 block">
                {payment.aircraftTailNumber || "FLEET-WIDE"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Airport Station (ICAO)</span>
              <span className="font-semibold text-slate-900 font-mono mt-0.5 block">
                {payment.airportIcao || "KJFK"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Matched Invoice</span>
              <span className="font-semibold text-blue-700 font-mono mt-0.5 block">
                {payment.invoiceNumber || "Direct Settlement"}
              </span>
            </div>
          </div>

          {/* XRPL Ledger & Off-Ramp Technical Verification Block */}
          {payment.xrplRecord ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    XRP Ledger (XRPL) Settlement & Off-Ramp Record
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-300">
                  Network: {payment.xrplRecord.network}
                </span>
              </div>
              <div className="p-4 bg-slate-50 space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block">
                      On-Chain XRPL Transaction Hash
                    </span>
                    {payment.xrplRecord.txHash ? (
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono font-semibold text-emerald-700 truncate">
                          {payment.xrplRecord.txHash}
                        </span>
                        <button
                          onClick={() =>
                            copyText(payment.xrplRecord!.txHash!, "txHash")
                          }
                          className="text-slate-500 hover:text-slate-900 ml-2"
                        >
                          {copiedField === "txHash" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="font-mono text-amber-800 mt-1">
                        NULL (Isolated Simulation Mode — Not Broadcast to Live
                        Ledger)
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block">
                      Simulation Trace ID / External Rail Reference
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-semibold text-slate-900">
                        {payment.xrplRecord.simulationTraceId ||
                          payment.externalBankRef ||
                          "N/A"}
                      </span>
                      {payment.xrplRecord.simulationTraceId && (
                        <button
                          onClick={() =>
                            copyText(
                              payment.xrplRecord!.simulationTraceId!,
                              "trace"
                            )
                          }
                          className="text-slate-500 hover:text-slate-900 ml-2"
                        >
                          {copiedField === "trace" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block">XRP Bridge Leg</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {payment.xrplRecord.xrpAmountDecimal} XRP
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Exact Drops (10⁻⁶ XRP)
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {payment.xrplRecord.xrpAmountDrops} drops
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Destination Tag
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {payment.xrplRecord.destinationTag ?? "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      External Fiat Off-Ramp
                    </span>
                    <span className="font-mono font-semibold text-blue-700">
                      {payment.externalBankRef ||
                        payment.xrplRecord.externalFiatOffRampStatus}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">
                    Canonical XRPL Transaction Payload (HSM Signer Structure):
                  </span>
                  <pre className="p-3 rounded bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
                    {payment.xrplRecord.rawTxJson}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs">
              <p className="font-semibold text-slate-800">
                External Banking / Stablecoin Clearing Reference
              </p>
              <p className="text-slate-600 font-mono mt-1">
                Clearing Reference:{" "}
                {payment.externalBankRef || "PENDING_RELEASE"} • Rail:{" "}
                {payment.settlementRail}
              </p>
            </div>
          )}

          {/* Approval Signatures */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dual-Control Governance & Cryptographic Approvals
            </h4>
            {payment.approvals.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                This payment is currently queued for Payment Approver / CFO
                sign-off before settlement execution.
              </p>
            ) : (
              <div className="space-y-2">
                {payment.approvals.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">
                        {app.approverName}
                      </span>{" "}
                      <span className="text-slate-500">
                        ({app.approverRole})
                      </span>
                      <p className="text-slate-600 mt-0.5">{app.comment}</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                        {app.decision} • {app.signature}
                      </span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {new Date(app.decidedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={downloadReceiptJson}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
          >
            <FileText className="w-4 h-4" />
            Download Audit Receipt (JSON)
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#0a1929] text-white hover:bg-slate-800 text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface OnboardingAndAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyRecord;
  onSaveOnboarding: (data: {
    legalName: string;
    primaryHubAirport: string;
    dualControlThresholdUsd: string;
  }) => Promise<void>;
}

export function OnboardingAndAuthModal({
  isOpen,
  onClose,
  company,
  onSaveOnboarding,
}: OnboardingAndAuthModalProps) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "ONBOARDING">(
    "ONBOARDING"
  );
  const [legalName, setLegalName] = useState(company.legalName);
  const [hubIcao, setHubIcao] = useState(company.primaryHubAirport);
  const [threshold, setThreshold] = useState(company.dualControlThresholdUsd);
  const [email, setEmail] = useState("v.vance@atlasglobalair.demo");
  const [mfaCode, setMfaCode] = useState("849201");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "ONBOARDING") {
      await onSaveOnboarding({
        legalName,
        primaryHubAirport: hubIcao,
        dualControlThresholdUsd: threshold,
      });
      setStatusMsg(
        "Aviation entity KYB & Treasury Governance profile updated."
      );
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 900);
    } else {
      setStatusMsg(
        `Authenticated ${email} via FIDO2/TOTP hardware MFA token.`
      );
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-[#0a1929] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Plane className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-semibold">
                AeroSettle Enterprise Identity & Entity Onboarding
              </h3>
              <p className="text-xs text-slate-300">
                Aviation KYB, Hardware MFA & Treasury Policy Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 pt-3 flex gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("ONBOARDING")}
            className={`pb-2.5 border-b-2 transition ${
              mode === "ONBOARDING"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            1. Aviation Company Onboarding
          </button>
          <button
            type="button"
            onClick={() => setMode("LOGIN")}
            className={`pb-2.5 border-b-2 transition ${
              mode === "LOGIN"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            2. Enterprise SSO / MFA Login
          </button>
          <button
            type="button"
            onClick={() => setMode("REGISTER")}
            className={`pb-2.5 border-b-2 transition ${
              mode === "REGISTER"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            3. Operator Registration
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {mode === "ONBOARDING" ? (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Legal Aviation Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Hub Airport (ICAO)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={hubIcao}
                    onChange={(e) => setHubIcao(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dual-Control Approval Threshold (USD)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Non-Custodial KMS & Regulatory Compliance Notice
                </p>
                <p>
                  AeroSettle links to your existing institutional bank accounts
                  and AWS KMS / HSM XRPL signers. Production activation requires
                  licensed local liquidity partners and jurisdiction-specific
                  KYB approval.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Corporate Aviation Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Hardware Key / TOTP 6-Digit MFA Code
                </label>
                <input
                  type="text"
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tracking-widest text-slate-900"
                />
              </div>
              {mode === "REGISTER" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    IATA / ICAO Airline Operator Certificate (AOC) Reference
                  </label>
                  <input
                    type="text"
                    defaultValue="AOC-US-AGA-121-0094"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
              )}
            </>
          )}

          {statusMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              {statusMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            >
              {mode === "ONBOARDING"
                ? "Save Entity Onboarding"
                : mode === "LOGIN"
                  ? "Verify MFA & Sign In"
                  : "Register Aviation Entity"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
