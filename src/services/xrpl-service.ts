import crypto from "crypto";
import { DecimalMoney } from "@/lib/decimal";
import {
  ExecutionClassification,
  XrplNetworkMode,
  XrplTransactionRecord,
} from "@/types/aerosettle";

/**
 * Official XRP Ledger JSON-RPC Endpoints per https://xrpl.org/docs/tutorials/public-servers
 */
export const XRPL_ENDPOINTS: Record<
  XrplNetworkMode,
  {
    name: string;
    jsonRpcUrl: string | null;
    wsUrl: string | null;
    explorerTxUrlPrefix: string | null;
    isLiveNetwork: boolean;
  }
> = {
  SIMULATION_SANDBOX: {
    name: "AeroSettle Isolated XRPL Simulation Sandbox",
    jsonRpcUrl: null,
    wsUrl: null,
    explorerTxUrlPrefix: null,
    isLiveNetwork: false,
  },
  XRPL_TESTNET: {
    name: "XRP Ledger Testnet (Altnet)",
    jsonRpcUrl:
      process.env.XRPL_TESTNET_RPC_URL ||
      "https://s.altnet.rippletest.net:51234/",
    wsUrl:
      process.env.XRPL_TESTNET_WS_URL || "wss://s.altnet.rippletest.net:51233/",
    explorerTxUrlPrefix: "https://testnet.xrpl.org/transactions/",
    isLiveNetwork: true,
  },
  XRPL_MAINNET: {
    name: "XRP Ledger Mainnet (Production Config)",
    jsonRpcUrl:
      process.env.XRPL_MAINNET_RPC_URL || "https://xrplcluster.com/",
    wsUrl: "wss://xrplcluster.com/",
    explorerTxUrlPrefix: "https://livenet.xrpl.org/transactions/",
    isLiveNetwork: true,
  },
};

export interface XrplAccountInfoResponse {
  network: XrplNetworkMode;
  classicAddress: string;
  xrpBalanceDrops: string;
  xrpBalanceDecimal: string;
  sequenceNumber: number;
  ownerCount: number;
  baseReserveXrp: string;
  ownerReserveXrp: string;
  availableSpendableXrp: string;
  ledgerIndex: number | null;
  validated: boolean;
  isSimulated: boolean;
  statusMessage: string;
}

export interface XrplSettlementRequest {
  walletId: string;
  network: XrplNetworkMode;
  sourceAddress: string;
  destinationAddress: string;
  destinationTag?: number;
  xrpAmountDecimal: string;
  deliveredCurrency: string;
  deliveredValue: string;
  paymentReference: string;
  invoiceNumber?: string;
  aircraftTailNumber?: string;
  airportIcao?: string;
}

/**
 * Validates XRPL classic address format (starts with 'r', base58 alphabet, 25-35 chars)
 */
export function isValidXrplClassicAddress(address: string): boolean {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address.trim());
}

/**
 * Encodes an aviation settlement memo into standard XRPL hexadecimal MemoData format
 */
export function encodeXrplAviationMemoHex(memoPayload: {
  paymentReference: string;
  invoiceNumber?: string;
  aircraftTailNumber?: string;
  airportIcao?: string;
}): {
  MemoType: string;
  MemoFormat: string;
  MemoData: string;
} {
  const jsonStr = JSON.stringify({
    platform: "AEROSETTLE-V1",
    ref: memoPayload.paymentReference,
    inv: memoPayload.invoiceNumber || "N/A",
    tail: memoPayload.aircraftTailNumber || "FLEET",
    icao: memoPayload.airportIcao || "GLOBAL",
  });
  return {
    MemoType: Buffer.from("aviation/settlement", "utf8")
      .toString("hex")
      .toUpperCase(),
    MemoFormat: Buffer.from("application/json", "utf8")
      .toString("hex")
      .toUpperCase(),
    MemoData: Buffer.from(jsonStr, "utf8").toString("hex").toUpperCase(),
  };
}

/**
 * Queries account balance and reserve state via official XRPL `account_info` JSON-RPC method,
 * or returns clearly labeled isolated simulation state when in SIMULATION_SANDBOX or offline.
 */
export async function fetchXrplAccountBalance(
  classicAddress: string,
  network: XrplNetworkMode,
  fallbackSimulatedDrops: string = "1425000000000" // 1,425,000.000000 XRP
): Promise<XrplAccountInfoResponse> {
  const endpoint = XRPL_ENDPOINTS[network];

  if (!endpoint.isLiveNetwork || !endpoint.jsonRpcUrl) {
    const totalDec = DecimalMoney.fromMicroUnits(BigInt(fallbackSimulatedDrops));
    const reserveDec = DecimalMoney.fromString("1.400000"); // 1.0 base + 2 * 0.2 owner
    const spendable = totalDec.subtract(reserveDec);
    return {
      network: "SIMULATION_SANDBOX",
      classicAddress,
      xrpBalanceDrops: fallbackSimulatedDrops,
      xrpBalanceDecimal: totalDec.toDatabaseDecimal(),
      sequenceNumber: 840219,
      ownerCount: 2,
      baseReserveXrp: "1.000000",
      ownerReserveXrp: "0.400000",
      availableSpendableXrp: spendable.toDatabaseDecimal(),
      ledgerIndex: null,
      validated: false,
      isSimulated: true,
      statusMessage:
        "Isolated Simulation Sandbox active. No live on-chain balance queried.",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(endpoint.jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "account_info",
        params: [
          {
            account: classicAddress,
            ledger_index: "validated",
            strict: true,
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`XRPL RPC returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = data?.result;

    if (result?.status === "success" && result?.account_data) {
      const dropsStr = String(result.account_data.Balance || "0");
      const ownerCount = Number(result.account_data.OwnerCount || 0);
      const totalDec = DecimalMoney.fromMicroUnits(BigInt(dropsStr));
      const baseRes = DecimalMoney.fromString("1.000000");
      const ownerRes = DecimalMoney.fromString(
        (ownerCount * 0.2).toFixed(6)
      );
      const totalRes = baseRes.add(ownerRes);
      const spendable = totalDec.greaterThan(totalRes)
        ? totalDec.subtract(totalRes)
        : DecimalMoney.zero();

      return {
        network,
        classicAddress,
        xrpBalanceDrops: dropsStr,
        xrpBalanceDecimal: totalDec.toDatabaseDecimal(),
        sequenceNumber: Number(result.account_data.Sequence || 1),
        ownerCount,
        baseReserveXrp: baseRes.toDatabaseDecimal(),
        ownerReserveXrp: ownerRes.toDatabaseDecimal(),
        availableSpendableXrp: spendable.toDatabaseDecimal(),
        ledgerIndex: Number(result.ledger_index || 0),
        validated: Boolean(result.validated),
        isSimulated: false,
        statusMessage: `Live ${endpoint.name} validated ledger #${result.ledger_index}.`,
      };
    }

    throw new Error(result?.error_message || "Account not funded on live ledger");
  } catch (err) {
    const totalDec = DecimalMoney.fromMicroUnits(BigInt(fallbackSimulatedDrops));
    const reserveDec = DecimalMoney.fromString("1.400000");
    const spendable = totalDec.subtract(reserveDec);
    const reason =
      err instanceof Error ? err.message : "Network unreachable in sandbox";
    return {
      network,
      classicAddress,
      xrpBalanceDrops: fallbackSimulatedDrops,
      xrpBalanceDecimal: totalDec.toDatabaseDecimal(),
      sequenceNumber: 840219,
      ownerCount: 2,
      baseReserveXrp: "1.000000",
      ownerReserveXrp: "0.400000",
      availableSpendableXrp: spendable.toDatabaseDecimal(),
      ledgerIndex: null,
      validated: false,
      isSimulated: true,
      statusMessage: `Simulation Fallback (${reason}). Configure XRPL_SERVER_SIGNER_SEED & network access for live ${endpoint.name} queries.`,
    };
  }
}

/**
 * Verifies an existing XRPL transaction hash on Testnet or Mainnet using the `tx` RPC method.
 * Never fabricates on-chain validation if the network is unreachable or the hash does not exist.
 */
export async function verifyXrplTransactionOnLedger(
  txHash: string,
  network: XrplNetworkMode
): Promise<{
  verifiedOnChain: boolean;
  network: XrplNetworkMode;
  txHash: string;
  ledgerIndex: number | null;
  engineResult: string | null;
  validated: boolean;
  message: string;
}> {
  const cleanHash = txHash.trim().toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(cleanHash)) {
    return {
      verifiedOnChain: false,
      network,
      txHash: cleanHash,
      ledgerIndex: null,
      engineResult: null,
      validated: false,
      message:
        "Invalid XRPL transaction hash format. Real XRPL transaction hashes are 64-character hexadecimal SHA-512Half digests. Simulation trace IDs (SIM-XRPL-...) are isolated simulation records and do not exist on-chain.",
    };
  }

  const endpoint = XRPL_ENDPOINTS[network];
  if (!endpoint.isLiveNetwork || !endpoint.jsonRpcUrl) {
    return {
      verifiedOnChain: false,
      network,
      txHash: cleanHash,
      ledgerIndex: null,
      engineResult: null,
      validated: false,
      message:
        "Currently in Isolated Simulation Sandbox mode. Switch network selector to XRPL Testnet or Mainnet with live RPC connectivity to verify on-chain hashes.",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(endpoint.jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "tx",
        params: [
          {
            transaction: cleanHash,
            binary: false,
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    const res = data?.result;
    if (res?.status === "success") {
      const engineResult = res.meta?.TransactionResult || "UNKNOWN";
      const validated = Boolean(res.validated);
      return {
        verifiedOnChain: validated && engineResult === "tesSUCCESS",
        network,
        txHash: cleanHash,
        ledgerIndex: Number(res.ledger_index || 0),
        engineResult,
        validated,
        message: validated
          ? `Confirmed on ${endpoint.name} Ledger #${res.ledger_index} (${engineResult}). Note: On-chain validation confirms digital asset settlement only; external banking fiat off-ramp is tracked separately.`
          : `Transaction found on ${endpoint.name} but not yet validated in a closed ledger.`,
      };
    }
    return {
      verifiedOnChain: false,
      network,
      txHash: cleanHash,
      ledgerIndex: null,
      engineResult: res?.error || null,
      validated: false,
      message:
        res?.error_message ||
        "Transaction hash not found on the selected XRPL network.",
    };
  } catch (err) {
    return {
      verifiedOnChain: false,
      network,
      txHash: cleanHash,
      ledgerIndex: null,
      engineResult: null,
      validated: false,
      message: `Unable to reach ${endpoint.name} RPC endpoint (${
        err instanceof Error ? err.message : "offline environment"
      }).`,
    };
  }
}

/**
 * Constructs and processes an XRPL settlement transaction.
 * Strictly isolates simulated executions from real on-chain broadcasts:
 * - Never fabricates a fake 64-hex `txHash` for simulated payments (`txHash` is strictly `null`).
 * - Generates an explicit `simulationTraceId` (`SIM-XRPL-...`) and sets `executionClassification = "SIMULATED_PAYMENT"`.
 * - Includes the exact canonical XRPL `Payment` transaction payload (with Drops, Fee, DestinationTag, and hex-encoded Aviation Memo) ready for HSM/KMS signing.
 */
export function buildXrplSettlementRecord(
  req: XrplSettlementRequest
): XrplTransactionRecord {
  const xrpDec = DecimalMoney.fromString(req.xrpAmountDecimal);
  const dropsStr = xrpDec.toDropsString();
  const memoObj = encodeXrplAviationMemoHex({
    paymentReference: req.paymentReference,
    invoiceNumber: req.invoiceNumber,
    aircraftTailNumber: req.aircraftTailNumber,
    airportIcao: req.airportIcao,
  });

  const canonicalXrplTx = {
    TransactionType: "Payment",
    Account: req.sourceAddress,
    Destination: req.destinationAddress,
    ...(req.destinationTag ? { DestinationTag: req.destinationTag } : {}),
    Amount: dropsStr,
    Fee: "12", // 12 drops = 0.000012 XRP standard open-ledger cost
    Flags: 2147483648, // tfFullyCanonicalSig
    Memos: [{ Memo: memoObj }],
  };

  const simDigest = crypto
    .createHash("sha256")
    .update(`${req.paymentReference}:${Date.now()}:${dropsStr}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  const simulationTraceId = `SIM-XRPL-${simDigest}`;
  const executionClassification: ExecutionClassification = "SIMULATED_PAYMENT";

  return {
    id: `xrpl_rec_${Date.now()}`,
    walletId: req.walletId,
    network: "SIMULATION_SANDBOX",
    txHash: null, // Explicitly null in simulation mode — never fake an on-chain hash
    simulationTraceId,
    txType: "Payment",
    sourceAddress: req.sourceAddress,
    destinationAddress: req.destinationAddress,
    destinationTag: req.destinationTag,
    xrpAmountDrops: dropsStr,
    xrpAmountDecimal: xrpDec.toDatabaseDecimal(),
    deliveredAmountCurrency: req.deliveredCurrency,
    deliveredAmountValue: req.deliveredValue,
    feeDrops: "12",
    ledgerIndex: null,
    engineResult: "SIMULATED_TES_SUCCESS",
    validatedOnLedger: false,
    externalFiatOffRampStatus: "SIMULATED_OFFRAMP",
    executionClassification,
    memoHex: memoObj.MemoData,
    rawTxJson: JSON.stringify(canonicalXrplTx, null, 2),
    createdAt: new Date().toISOString(),
  };
}
