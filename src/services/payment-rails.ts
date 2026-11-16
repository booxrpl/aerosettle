import { DecimalMoney } from "@/lib/decimal";
import {
  CurrencyExchangeQuoteRecord,
  PaymentCorridorSpec,
  SettlementRail,
} from "@/types/aerosettle";

/**
 * Institutional Reference Mid-Market FX Rates (1 USD = X Units of Currency)
 * XRP Reference Institutional Price: 1 XRP = $2.450000 USD
 */
export const USD_FX_RATES: Record<string, string> = {
  USD: "1.00000000",
  EUR: "0.92450000",
  AED: "3.67250000",
  SGD: "1.34100000",
  BRL: "5.78400000",
  GBP: "0.78900000",
  CHF: "0.88200000",
  JPY: "153.40000000",
  XRP: "0.40816327", // 1 USD = 0.40816327 XRP (1 XRP = $2.45 USD)
  RLUSD: "1.00000000",
};

export const XRP_USD_PRICE = "2.450000";

/**
 * Aviation International Settlement Corridors
 * Explicitly models supported corridors, liquidity depth, off-ramp rails, and unsupported/restricted corridors.
 */
export const AVIATION_SETTLEMENT_CORRIDORS: PaymentCorridorSpec[] = [
  {
    id: "corridor-usd-aed-dxb",
    name: "US Hub (KJFK) → Dubai Aviation Fuel Corridor (OMDB)",
    sourceCurrency: "USD",
    destinationCurrency: "AED",
    originHub: "KJFK (New York)",
    destinationHub: "OMDB (Dubai Int'l)",
    destinationCountry: "United Arab Emirates",
    aviationUseCase: "Jet A-1 Fuel Uplift & Into-Plane Hydrant Services",
    supported: true,
    xrplBridgeSupported: true,
    stablecoinSupported: true,
    traditionalRail: "SWIFT_GPI",
    xrplSpreadBps: 14, // 0.14%
    traditionalSpreadBps: 65, // 0.65%
    xrplEstimatedSec: 18, // 4s XRPL + 14s UAEFTS partner off-ramp
    traditionalEstimatedSec: 86400, // 24 hours
    xrplFixedFeeUsd: "15.00",
    traditionalFixedFeeUsd: "85.00",
    liquidityProvider: "MENA Regulated Digital Asset Desk (VARA/ADGM Licensed LP)",
    offRampRailName: "UAEFTS (Central Bank of UAE Instant Domestic Payout)",
    regulatoryNote:
      "XRP settles the cross-border leg in ~3.8s; licensed UAE liquidity partner converts XRP to AED and disburses via UAEFTS into supplier IBAN.",
  },
  {
    id: "corridor-usd-eur-fra",
    name: "US Hub (KJFK) → Frankfurt MRO & Heavy Overhaul Corridor (EDDF)",
    sourceCurrency: "USD",
    destinationCurrency: "EUR",
    originHub: "KJFK (New York)",
    destinationHub: "EDDF (Frankfurt Main)",
    destinationCountry: "Germany",
    aviationUseCase: "Airframe C/D-Check MRO & Engine Overhaul Reserves",
    supported: true,
    xrplBridgeSupported: true,
    stablecoinSupported: true,
    traditionalRail: "SEPA_INSTANT",
    xrplSpreadBps: 11, // 0.11%
    traditionalSpreadBps: 48, // 0.48%
    xrplEstimatedSec: 12, // 4s XRPL + 8s SEPA Instant
    traditionalEstimatedSec: 43200, // 12 hours cross-currency USD->EUR
    xrplFixedFeeUsd: "12.00",
    traditionalFixedFeeUsd: "65.00",
    liquidityProvider: "Frankfurt MiCA-Compliant Institutional Liquidity Venue",
    offRampRailName: "SEPA Instant Credit Transfer (RT1 / TIPS)",
    regulatoryNote:
      "USD is bridged via XRP or RLUSD to Frankfurt LP, followed by instant EUR payout over SEPA Instant to MRO facility IBAN.",
  },
  {
    id: "corridor-usd-sgd-sin",
    name: "US Hub (KLAX) → Singapore Avionics & AOG Parts Corridor (WSSS)",
    sourceCurrency: "USD",
    destinationCurrency: "SGD",
    originHub: "KLAX (Los Angeles)",
    destinationHub: "WSSS (Singapore Changi)",
    destinationCountry: "Singapore",
    aviationUseCase: "AOG Rotable Components, Avionics & APU Spare Parts",
    supported: true,
    xrplBridgeSupported: true,
    stablecoinSupported: true,
    traditionalRail: "SWIFT_GPI",
    xrplSpreadBps: 12,
    traditionalSpreadBps: 55,
    xrplEstimatedSec: 14, // 4s XRPL + 10s Singapore FAST
    traditionalEstimatedSec: 72000, // 20 hours
    xrplFixedFeeUsd: "12.00",
    traditionalFixedFeeUsd: "75.00",
    liquidityProvider: "MAS Major Payment Institution (MPI) Liquidity Partner",
    offRampRailName: "Singapore FAST (Fast And Secure Transfers)",
    regulatoryNote:
      "Critical for AOG (Aircraft on Ground) parts release where 24-hour SWIFT delays cost airlines $100k+ per grounded day.",
  },
  {
    id: "corridor-usd-brl-gru",
    name: "US Hub (KMIA) → São Paulo Ground Handling & Ramp Corridor (SBGR)",
    sourceCurrency: "USD",
    destinationCurrency: "BRL",
    originHub: "KMIA (Miami Int'l)",
    destinationHub: "SBGR (São Paulo Guarulhos)",
    destinationCountry: "Brazil",
    aviationUseCase: "Ground Handling, De-Icing, Catering & Landing Fees",
    supported: true,
    xrplBridgeSupported: true,
    stablecoinSupported: false, // Direct RLUSD off-ramp restricted; XRP bridge via BACEN eFX partner enabled
    traditionalRail: "SWIFT_GPI",
    xrplSpreadBps: 24,
    traditionalSpreadBps: 115,
    xrplEstimatedSec: 26, // 4s XRPL + 22s BACEN PIX/TED eFX settlement
    traditionalEstimatedSec: 172800, // 48 hours due to Brazilian FX contract registration
    xrplFixedFeeUsd: "22.00",
    traditionalFixedFeeUsd: "120.00",
    liquidityProvider: "BACEN-Authorized eFX & Digital Settlement Institution",
    offRampRailName: "Brazil PIX Institutional / STR TED",
    regulatoryNote:
      "XRP bridgeSupported via BACEN eFX partner with automated IOF/FX registration. Direct USD stablecoin payout to local bank accounts is not enabled in this corridor.",
  },
  {
    id: "corridor-eur-gbp-lhr",
    name: "European Hub (EHAM) → London Heathrow Slot & Leasing Corridor (EGLL)",
    sourceCurrency: "EUR",
    destinationCurrency: "GBP",
    originHub: "EHAM (Amsterdam Schiphol)",
    destinationHub: "EGLL (London Heathrow)",
    destinationCountry: "United Kingdom",
    aviationUseCase: "Wet-Lease ACMI Contracts & UK Airport Slot Charges",
    supported: true,
    xrplBridgeSupported: true,
    stablecoinSupported: true,
    traditionalRail: "SWIFT_GPI",
    xrplSpreadBps: 10,
    traditionalSpreadBps: 42,
    xrplEstimatedSec: 11,
    traditionalEstimatedSec: 28800,
    xrplFixedFeeUsd: "10.00",
    traditionalFixedFeeUsd: "55.00",
    liquidityProvider: "FCA-Registered Institutional ODL Partner",
    offRampRailName: "UK Faster Payments Service (FPS)",
    regulatoryNote:
      "Near-instant EUR→XRP→GBP conversion with UK FPS credit to lessor account.",
  },
  {
    id: "corridor-usd-kzt-ala",
    name: "US Hub (KJFK) → Almaty Tech Stop Corridor (UAAA) [UNSUPPORTED ON XRPL]",
    sourceCurrency: "USD",
    destinationCurrency: "KZT",
    originHub: "KJFK (New York)",
    destinationHub: "UAAA (Almaty Int'l)",
    destinationCountry: "Kazakhstan",
    aviationUseCase: "Polar Cargo Tech-Stop Overflight & Refueling",
    supported: false,
    xrplBridgeSupported: false,
    stablecoinSupported: false,
    traditionalRail: "SWIFT_GPI",
    xrplSpreadBps: 0,
    traditionalSpreadBps: 140,
    xrplEstimatedSec: 0,
    traditionalEstimatedSec: 259200, // 72 hours
    xrplFixedFeeUsd: "0.00",
    traditionalFixedFeeUsd: "145.00",
    liquidityProvider: "No Active Regulated XRPL/KZT Off-Ramp Partner",
    offRampRailName: "Traditional Correspondent Bank SWIFT Only",
    regulatoryNote:
      "Corridor Not Supported on XRPL Bridge: Insufficient KZT on-ledger orderbook depth and no licensed local fiat off-ramp partner currently integrated. Must route via traditional SWIFT correspondent banking with manual compliance review.",
  },
];

export function convertCurrencyAmount(
  amountStr: string,
  fromCurrency: string,
  toCurrency: string
): {
  midRate: string;
  convertedAmount: string;
  usdEquivalent: string;
} {
  const amount = DecimalMoney.fromString(amountStr);
  const fromPerUsd = Number(USD_FX_RATES[fromCurrency] || "1.0");
  const toPerUsd = Number(USD_FX_RATES[toCurrency] || "1.0");

  const usdRatio = 1 / fromPerUsd;
  const crossRate = toPerUsd / fromPerUsd;

  const usdEq = amount.multiplyByRate(usdRatio.toFixed(8));
  const converted = amount.multiplyByRate(crossRate.toFixed(8));

  return {
    midRate: crossRate.toFixed(8),
    convertedAmount: converted.toFixed(2),
    usdEquivalent: usdEq.toFixed(2),
  };
}

/**
 * Generates an institutional quote for any aviation payment across the modular payment adapters:
 * - XRPL_BRIDGE (XRP On-Demand Liquidity bridge)
 * - RLUSD_STABLECOIN (Regulated USD Stablecoin rail)
 * - SWIFT_GPI / SEPA_INSTANT / FEDWIRE (Traditional banking rails)
 */
export function generateModularPaymentQuote(params: {
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: string;
  settlementRail: SettlementRail;
}): CurrencyExchangeQuoteRecord {
  const { sourceCurrency, destinationCurrency, sourceAmount, settlementRail } =
    params;

  const corridor = AVIATION_SETTLEMENT_CORRIDORS.find(
    (c) =>
      c.sourceCurrency === sourceCurrency &&
      c.destinationCurrency === destinationCurrency
  );

  const baseConversion = convertCurrencyAmount(
    sourceAmount,
    sourceCurrency,
    destinationCurrency
  );
  const midRateNum = Number(baseConversion.midRate);

  let spreadBps = 15;
  let networkFeeUsd = "0.01";
  let platformFeeUsd = "14.99";
  let estimatedTimeSec = 15;
  let providerName = "AeroSettle XRPL Institutional Liquidity Composite";
  let bridgeAsset: "XRP" | "RLUSD" | null = null;
  let offRampPartner =
    corridor?.offRampRailName ||
    "Regulated Local Domestic Real-Time Payment Rail";
  let corridorSupported = true;
  let corridorNotes =
    corridor?.regulatoryNote ||
    "Settled via regulated liquidity provider and local instant clearing rail.";

  if (settlementRail === "XRPL_BRIDGE") {
    bridgeAsset = "XRP";
    spreadBps = corridor ? corridor.xrplSpreadBps : 16;
    networkFeeUsd = "0.01"; // 12 drops XRP network fee (< $0.0001)
    platformFeeUsd = corridor ? corridor.xrplFixedFeeUsd : "15.00";
    estimatedTimeSec = corridor ? corridor.xrplEstimatedSec : 16;
    providerName =
      corridor?.liquidityProvider ||
      "XRPL On-Demand Liquidity (ODL) Institutional Partner";
    if (corridor && !corridor.xrplBridgeSupported) {
      corridorSupported = false;
    }
  } else if (settlementRail === "RLUSD_STABLECOIN") {
    bridgeAsset = "RLUSD";
    spreadBps = corridor ? Math.max(8, corridor.xrplSpreadBps - 2) : 10;
    networkFeeUsd = "0.01";
    platformFeeUsd = "12.00";
    estimatedTimeSec = 14;
    providerName = "RLUSD Regulated Stablecoin Settlement Desk";
    if (corridor && !corridor.stablecoinSupported) {
      corridorSupported = false;
      corridorNotes =
        "RLUSD direct local bank off-ramp is not currently enabled in this jurisdiction; select XRPL Bridge (via eFX partner) or SWIFT GPI.";
    }
  } else {
    // Traditional banking adapter (SWIFT_GPI, SEPA_INSTANT, FEDWIRE)
    bridgeAsset = null;
    spreadBps = corridor ? corridor.traditionalSpreadBps : 65;
    networkFeeUsd = settlementRail === "SEPA_INSTANT" ? "15.00" : "45.00";
    platformFeeUsd = corridor ? corridor.traditionalFixedFeeUsd : "75.00";
    estimatedTimeSec =
      settlementRail === "SEPA_INSTANT"
        ? 600
        : settlementRail === "FEDWIRE"
          ? 7200
          : corridor?.traditionalEstimatedSec || 86400;
    providerName =
      settlementRail === "SWIFT_GPI"
        ? "Correspondent Banking Network (SWIFT gpi UETR)"
        : settlementRail === "SEPA_INSTANT"
          ? "European Banking Clearing (SEPA Instant RT1)"
          : "Federal Reserve Wire Network (Fedwire)";
    offRampPartner = "Direct Correspondent Bank Credit";
  }

  const appliedRateNum =
    sourceCurrency === destinationCurrency
      ? 1.0
      : midRateNum * (1 - spreadBps / 10000);

  const srcMoney = DecimalMoney.fromString(sourceAmount);
  const destMoney = srcMoney.multiplyByRate(appliedRateNum.toFixed(8));
  const netFeeMoney = DecimalMoney.fromString(networkFeeUsd);
  const platFeeMoney = DecimalMoney.fromString(platformFeeUsd);
  const totalFeeMoney = netFeeMoney.add(platFeeMoney);

  // Compute XRP bridge legs if XRPL_BRIDGE
  const usdEqMoney = DecimalMoney.fromString(baseConversion.usdEquivalent);
  const xrpUnits = usdEqMoney.multiplyByRate((1 / 2.45).toFixed(8));

  return {
    id: `qt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    quoteReference: `QTE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    providerName,
    settlementRail,
    sourceCurrency,
    destinationCurrency,
    sourceAmount: srcMoney.toFixed(2),
    destinationAmount: destMoney.toFixed(2),
    midMarketRate: midRateNum.toFixed(6),
    appliedRate: appliedRateNum.toFixed(6),
    bridgeAsset,
    bridgeRateXrpSource:
      bridgeAsset === "XRP"
        ? (Number(USD_FX_RATES[sourceCurrency] || 1) * 2.45).toFixed(6)
        : undefined,
    bridgeRateXrpDest:
      bridgeAsset === "XRP"
        ? (Number(USD_FX_RATES[destinationCurrency] || 1) * 2.45).toFixed(6)
        : undefined,
    bridgeXrpUnits: bridgeAsset === "XRP" ? xrpUnits.toFixed(6) : undefined,
    networkFeeUsd: netFeeMoney.toFixed(2),
    platformFeeUsd: platFeeMoney.toFixed(2),
    totalFeeUsd: totalFeeMoney.toFixed(2),
    corridorSpreadBps: spreadBps,
    estimatedTimeSec,
    offRampPartner,
    corridorSupported,
    corridorNotes,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}
