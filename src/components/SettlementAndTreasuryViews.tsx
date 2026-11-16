"use client";

import React, { useState } from "react";
import {
  Globe2,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Landmark,
  Wallet,
  Search,
  Info,
  Layers,
} from "lucide-react";
import { formatDecimalCurrency } from "@/lib/decimal";
import {
  CurrencyExchangeQuoteRecord,
  PaymentCorridorSpec,
  SettlementRail,
  TreasuryAccountRecord,
  WalletReferenceRecord,
  XrplNetworkMode,
} from "@/types/aerosettle";

interface InternationalSettlementViewProps {
  corridors: PaymentCorridorSpec[];
  xrplNetworkMode: XrplNetworkMode;
  wallets: WalletReferenceRecord[];
  onSwitchNetwork: (mode: XrplNetworkMode) => Promise<void>;
  onLaunchCorridorPayment: (corridor: PaymentCorridorSpec) => void;
}

export function InternationalSettlementView({
  corridors,
  xrplNetworkMode,
  wallets,
  onSwitchNetwork,
  onLaunchCorridorPayment,
}: InternationalSettlementViewProps) {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    corridors[0]?.id || "corridor-usd-aed-dxb"
  );
  const [simAmount, setSimAmount] = useState<string>("150000");
  const [selectedRail, setSelectedRail] =
    useState<SettlementRail>("XRPL_BRIDGE");
  const [quoteResult, setQuoteResult] =
    useState<CurrencyExchangeQuoteRecord | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  // XRPL Hash Verifier State
  const [hashInput, setHashInput] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<{
    verifiedOnChain: boolean;
    network: string;
    txHash: string;
    ledgerIndex: number | null;
    engineResult: string | null;
    message: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Live XRPL Account Info Query State
  const [liveAccountStatus, setLiveAccountStatus] = useState<string | null>(
    null
  );
  const [syncingWallet, setSyncingWallet] = useState(false);

  const activeCorridor =
    corridors.find((c) => c.id === selectedCorridorId) || corridors[0];

  const handleFetchComparisonQuote = async (
    corridor: PaymentCorridorSpec,
    rail: SettlementRail,
    amountStr: string
  ) => {
    setLoadingQuote(true);
    try {
      const res = await fetch("/api/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_QUOTE",
          sourceCurrency: corridor.sourceCurrency,
          destinationCurrency: corridor.destinationCurrency,
          sourceAmount: amountStr || "100000",
          settlementRail: rail,
        }),
      });
      const data = await res.json();
      if (data.quote) setQuoteResult(data.quote);
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleVerifyHash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashInput.trim()) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/xrpl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_HASH",
          txHash: hashInput,
          network: xrplNetworkMode,
        }),
      });
      const data = await res.json();
      if (data.verification) {
        setVerifyResult(data.verification);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleQueryLiveRpc = async () => {
    setSyncingWallet(true);
    try {
      const res = await fetch(
        `/api/xrpl?network=${xrplNetworkMode}&address=${
          wallets[0]?.classicAddress || "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
        }`
      );
      const data = await res.json();
      if (data.accountInfo) {
        setLiveAccountStatus(data.accountInfo.statusMessage);
      }
    } finally {
      setSyncingWallet(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & XRPL Network Mode Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                XRP Ledger Financial Infrastructure
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-700">
                Reference: https://xrpl.org/docs
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              International Aviation Settlement & Corridor Infrastructure
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Compare cross-border aviation payment corridors, evaluate XRP
              On-Demand Liquidity bridge conversion vs. regulated stablecoins
              and SWIFT gpi, and inspect XRPL ledger confirmations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-xs">
              <span className="text-slate-500 block font-medium">
                Active XRPL Service Environment
              </span>
              <span className="font-mono font-semibold text-slate-900">
                {xrplNetworkMode}
              </span>
            </div>
            <select
              aria-label="Select XRPL Network Mode"
              value={xrplNetworkMode}
              onChange={(e) =>
                onSwitchNetwork(e.target.value as XrplNetworkMode)
              }
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
            >
              <option value="SIMULATION_SANDBOX">
                Simulation Sandbox (Isolated)
              </option>
              <option value="XRPL_TESTNET">XRPL Testnet (Altnet RPC)</option>
              <option value="XRPL_MAINNET">
                XRPL Mainnet (Production Config)
              </option>
            </select>
            <button
              onClick={handleQueryLiveRpc}
              disabled={syncingWallet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1929] text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncingWallet ? "animate-spin" : ""}`}
              />
              Sync RPC
            </button>
          </div>
        </div>

        {liveAccountStatus && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <span>
              <strong>XRPL Service Layer Status:</strong> {liveAccountStatus}
            </span>
            <button
              onClick={() => setLiveAccountStatus(null)}
              className="text-blue-700 underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* How XRP Functions as a Neutral Bridge Asset in Aviation Settlement */}
      <div className="bg-[#0a1929] text-white rounded-xl p-6 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Architectural Flow: How XRP Bridges Aviation Currencies
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              XRP does not magically bypass banking laws—it replaces slow,
              pre-funded Nostro/Vostro correspondent hops between regulated
              institutional liquidity providers and local domestic instant
              payment rails.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            End-to-End Target: 11s – 26s (Where Supported)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800">
            <div className="text-blue-400 font-mono font-bold mb-1">
              STAGE 1 • ORIGINATION
            </div>
            <div className="font-semibold text-white">
              Airline Treasury Fiat Debit
            </div>
            <p className="text-slate-400 mt-1">
              Airline authorizes USD/EUR payment after 3-way invoice match &
              dual-control sign-off. Regulated originating liquidity desk
              converts source fiat into XRP or RLUSD.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/90 border border-blue-500/40">
            <div className="text-blue-400 font-mono font-bold mb-1">
              STAGE 2 • XRPL LEDGER (3.8s)
            </div>
            <div className="font-semibold text-white">
              Neutral Bridge Settlement
            </div>
            <p className="text-slate-400 mt-1">
              XRP transfers across the XRP Ledger in ~3–5 seconds with finality
              (`tesSUCCESS`, ~12 drops fee) carrying hex-encoded aviation
              invoice & ICAO station memos.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800">
            <div className="text-blue-400 font-mono font-bold mb-1">
              STAGE 3 • LOCAL OFF-RAMP LP
            </div>
            <div className="font-semibold text-white">
              Destination Currency Conversion
            </div>
            <p className="text-slate-400 mt-1">
              Licensed local liquidity partner in Dubai, Frankfurt, Singapore,
              or São Paulo converts XRP into local currency (AED, EUR, SGD, BRL)
              at locked quote rate.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800">
            <div className="text-emerald-400 font-mono font-bold mb-1">
              STAGE 4 • DOMESTIC BANK RAIL
            </div>
            <div className="font-semibold text-white">
              External Fiat Payout & Recon
            </div>
            <p className="text-slate-400 mt-1">
              Local partner disburses fiat via domestic instant rails (UAEFTS,
              SEPA Instant, FAST, PIX) into the fuel/MRO supplier&apos;s bank
              IBAN and reconciles the invoice.
            </p>
          </div>
        </div>
      </div>

      {/* Supported vs. Unsupported Aviation Corridors Table & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900">
            Configured International Aviation Settlement Corridors
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Click any corridor to inspect supported rails, liquidity providers,
            estimated spreads, and jurisdiction constraints.
          </p>

          <div className="space-y-3">
            {corridors.map((c) => {
              const isSelected = c.id === activeCorridor.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCorridorId(c.id);
                    handleFetchComparisonQuote(c, selectedRail, simAmount);
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/30 ring-1 ring-blue-600"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-900 text-white">
                        {c.sourceCurrency} → {c.destinationCurrency}
                      </span>
                      <span className="font-semibold text-sm text-slate-900">
                        {c.name}
                      </span>
                    </div>
                    {c.supported ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        XRPL Bridge Active ({c.xrplEstimatedSec}s)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Unsupported on XRPL (SWIFT Only)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">
                        Aviation Use Case
                      </span>
                      <span className="font-medium text-slate-800">
                        {c.aviationUseCase}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        XRPL Spread vs SWIFT
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {c.supported
                          ? `${c.xrplSpreadBps} bps vs ${c.traditionalSpreadBps} bps`
                          : `N/A (${c.traditionalSpreadBps} bps SWIFT)`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        Local Off-Ramp Rail
                      </span>
                      <span className="font-medium text-blue-700">
                        {c.offRampRailName}
                      </span>
                    </div>
                    <div className="flex items-end justify-end">
                      {c.supported && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchCorridorPayment(c);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                        >
                          Send on Corridor
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <strong>Regulatory & Liquidity Note:</strong>{" "}
                    {c.regulatoryNote}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Corridor Cost & Speed Calculator + On-Chain Hash Verifier */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">
              Corridor Quote & Rail Cost Simulator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Selected: {activeCorridor.originHub} →{" "}
              {activeCorridor.destinationHub}
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Source Amount ({activeCorridor.sourceCurrency})
                </label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Settlement Adapter
                </label>
                <select
                  aria-label="Settlement Adapter"
                  value={selectedRail}
                  onChange={(e) =>
                    setSelectedRail(e.target.value as SettlementRail)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  <option value="XRPL_BRIDGE">
                    XRP Ledger Bridge (ODL + Partner Off-Ramp)
                  </option>
                  <option value="RLUSD_STABLECOIN">
                    RLUSD Regulated Stablecoin Settlement
                  </option>
                  <option value="SWIFT_GPI">
                    Traditional Correspondent Bank (SWIFT gpi)
                  </option>
                  <option value="SEPA_INSTANT">
                    European SEPA Instant Credit Transfer
                  </option>
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleFetchComparisonQuote(
                    activeCorridor,
                    selectedRail,
                    simAmount
                  )
                }
                disabled={loadingQuote}
                className="w-full py-2 rounded-lg bg-[#0a1929] text-white font-semibold hover:bg-slate-800 transition"
              >
                {loadingQuote
                  ? "Calculating Corridor Quote..."
                  : "Calculate Live Corridor Quote"}
              </button>

              {quoteResult && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Quote Ref</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {quoteResult.quoteReference}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Corridor Status</span>
                    <span
                      className={`font-semibold ${
                        quoteResult.corridorSupported
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {quoteResult.corridorSupported
                        ? "Supported"
                        : "Restricted / Unsupported"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Applied FX Rate</span>
                    <span className="font-mono font-semibold text-slate-900">
                      1 {quoteResult.sourceCurrency} = {quoteResult.appliedRate}{" "}
                      {quoteResult.destinationCurrency}
                    </span>
                  </div>
                  {quoteResult.bridgeXrpUnits && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">XRP Bridge Leg</span>
                      <span className="font-mono font-semibold text-blue-700">
                        {quoteResult.bridgeXrpUnits} XRP
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Fees</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ${quoteResult.totalFeeUsd} USD (
                      {quoteResult.corridorSpreadBps} bps spread)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Est. Settlement Time</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {quoteResult.estimatedTimeSec < 120
                        ? `${quoteResult.estimatedTimeSec} seconds`
                        : `${Math.round(quoteResult.estimatedTimeSec / 3600)} hours`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      Net Supplier Credit
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {formatDecimalCurrency(
                        quoteResult.destinationAmount,
                        quoteResult.destinationCurrency
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* XRPL On-Chain Transaction Hash Verification Tool */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              XRPL Ledger Transaction Verifier (`tx` RPC)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify any 64-character hex XRPL transaction hash or test how
              AeroSettle distinguishes simulation trace IDs (`SIM-XRPL-...`)
              from validated on-chain transactions.
            </p>

            <form onSubmit={handleVerifyHash} className="mt-3 space-y-2.5">
              <input
                type="text"
                placeholder="Enter 64-hex XRPL Hash or SIM-XRPL-..."
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs text-slate-900"
              />
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                {verifying
                  ? "Querying XRPL Ledger..."
                  : "Verify Transaction on XRPL"}
              </button>
            </form>

            {verifyResult && (
              <div
                className={`mt-3 p-3 rounded-lg border text-xs ${
                  verifyResult.verifiedOnChain
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <div className="font-semibold">
                  {verifyResult.verifiedOnChain
                    ? "Validated On-Chain XRPL Transaction"
                    : "Not Verified On-Chain / Simulation Record"}
                </div>
                <p className="mt-1">{verifyResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TreasuryViewProps {
  accounts: TreasuryAccountRecord[];
  wallets: WalletReferenceRecord[];
  totalTreasuryUsd: string;
  xrplNetworkMode: XrplNetworkMode;
}

export function TreasuryOverviewView({
  accounts,
  wallets,
  totalTreasuryUsd,
  xrplNetworkMode,
}: TreasuryViewProps) {
  return (
    <div className="space-y-6">
      {/* Custody & Valuation Regulatory Banner */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <p className="font-bold">
            Important Custody, Balance & Valuation Disclosure
          </p>
          <p>
            AeroSettle is an enterprise payment orchestration and settlement
            platform, <strong>not a bank or digital asset custodian</strong>.
            Fiat balances displayed below reflect read-only Open Banking /
            SWIFT MT940 feeds from your linked external financial institutions.
            XRP and RLUSD balances reflect non-custodial KMS/HSM wallet signers
            or licensed third-party trust accounts, with USD equivalents shown
            strictly as indicative mid-market valuation estimates.
          </p>
        </div>
      </div>

      {/* Portfolio Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a1929] text-white rounded-xl p-5 border border-slate-800">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Indicative Total Portfolio Value (USD Eq.)
          </span>
          <div className="text-2xl font-bold font-mono mt-2">
            {formatDecimalCurrency(totalTreasuryUsd, "USD")}
          </div>
          <p className="text-xs text-blue-300 mt-1">
            Across 3 Linked External Fiat Banks & 2 XRPL Institutional Rails
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            External Linked Fiat Bank Balances
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            $9,221,626.26
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Held at JPMorgan Chase (USD), Deutsche Bank (EUR), Emirates NBD
            (AED)
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Non-Custodial XRPL & Stablecoin Liquidity
          </span>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-2">
            $4,741,250.00
          </div>
          <p className="text-xs text-slate-500 mt-1">
            1,425,000 XRP (@ $2.45 indicative) + 1,250,000 RLUSD Trustline
          </p>
        </div>
      </div>

      {/* Multi-Currency Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Multi-Currency Accounts, Custody Architecture & Exposure
            </h3>
            <p className="text-xs text-slate-500">
              Clearly distinguishing external bank balances, non-custodial XRPL
              signer reserves, and indicative USD valuations.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Account & Code</th>
                <th className="py-3 px-4">Asset & Custody Classification</th>
                <th className="py-3 px-4">Holding Institution / Signer</th>
                <th className="py-3 px-4 text-right">Available Balance</th>
                <th className="py-3 px-4 text-right">Reserved / Encumbered</th>
                <th className="py-3 px-4 text-right">
                  Indicative USD Valuation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/80">
                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-900">
                      {acc.accountName}
                    </div>
                    <div className="font-mono text-slate-500 text-[11px]">
                      {acc.accountCode} • {acc.accountIdentifier}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                        acc.custodyType === "EXTERNAL_BANK_LINKED"
                          ? "bg-slate-100 text-slate-800 border border-slate-300"
                          : acc.custodyType === "NON_CUSTODIAL_XRPL_SIGNER"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                      }`}
                    >
                      {acc.custodyType}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      {acc.custodyDisclosure}
                    </p>
                  </td>
                  <td className="py-4 px-4 font-medium text-slate-800">
                    {acc.institutionName}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    {formatDecimalCurrency(acc.availableBalance, acc.currency)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-slate-600">
                    {formatDecimalCurrency(acc.reservedBalance, acc.currency)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-semibold text-blue-700">
                    {formatDecimalCurrency(acc.usdEquivalent, "USD")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* XRPL Non-Custodial Wallet References & Reserve Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              Non-Custodial XRPL Wallet References & Ledger Reserves
            </h3>
            <p className="text-xs text-slate-500">
              Private keys and seed phrases are never stored in browser state or
              frontend code; signing occurs strictly via isolated KMS/HSM
              endpoints.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono bg-slate-100 text-slate-800">
            Network: {xrplNetworkMode}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{w.label}</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px]">
                  {w.network}
                </span>
              </div>
              <div className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
                Classic Address: <strong>{w.classicAddress}</strong>
                <br />
                X-Address: {w.xAddress}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">XRP Balance</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Number(w.xrpBalanceDecimal).toLocaleString()} XRP
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">
                    Ledger Reserves
                  </span>
                  <span className="font-mono font-semibold text-slate-700">
                    {w.baseReserveXrp} Base + {w.ownerReserveXrp} Owner
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">RLUSD Trustline</span>
                  <span className="font-mono font-bold text-blue-700">
                    ${Number(w.rlusdBalanceDecimal).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                <strong>Custody Architecture:</strong> {w.custodyArchitecture}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
