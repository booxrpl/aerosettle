import assert from "assert";
import { NextRequest } from "next/server";
import { DecimalMoney, formatDecimalCurrency } from "../src/lib/decimal";
import {
  buildXrplSettlementRecord,
  encodeXrplAviationMemoHex,
  fetchXrplAccountBalance,
  isValidXrplClassicAddress,
  verifyXrplTransactionOnLedger,
} from "../src/services/xrpl-service";
import { generateModularPaymentQuote } from "../src/services/payment-rails";
import {
  appendAuditLog,
  checkActiveUserPermission,
  createInitialSeedDatabase,
} from "../src/db/store";
import {
  GET as getPlatform,
  POST as postPlatform,
} from "../src/app/api/platform/route";
import { GET as getXrpl, POST as postXrpl } from "../src/app/api/xrpl/route";

async function runAcceptanceSuite() {
  console.log("=== AEROSETTLE ACCEPTANCE & ARCHITECTURE TEST SUITE ===");

  // 1. Precise Decimal Arithmetic (No Floating-Point Drift)
  const a = DecimalMoney.fromString("0.100000");
  const b = DecimalMoney.fromString("0.200000");
  assert.strictEqual(
    a.add(b).toDatabaseDecimal(),
    "0.300000",
    "DecimalMoney must avoid 0.1 + 0.2 floating-point drift"
  );
  const fuelQty = "160000";
  const unitPrice = DecimalMoney.fromString("3.200000");
  const fuelLineTotal = unitPrice.multiplyByQuantity(fuelQty);
  assert.strictEqual(fuelLineTotal.toFixed(2), "512000.00");
  assert.strictEqual(
    formatDecimalCurrency("512000.00", "AED"),
    "AED 512,000.00"
  );
  console.log("✔ [1/7] Precise fixed-point DecimalMoney arithmetic verified.");

  // 2. XRPL Service Layer & Strict Isolation of Simulation Mode
  assert.strictEqual(
    isValidXrplClassicAddress("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"),
    true
  );
  assert.strictEqual(isValidXrplClassicAddress("0xInvalidEthAddress"), false);

  const memo = encodeXrplAviationMemoHex({
    paymentReference: "PAY-2026-90999",
    invoiceNumber: "INV-DXB-2026-8841",
    aircraftTailNumber: "N789AS",
    airportIcao: "OMDB",
  });
  assert.ok(memo.MemoData.length > 20, "Hex memo must be populated");

  const simRecord = buildXrplSettlementRecord({
    walletId: "wal_xrpl_primary_01",
    network: "SIMULATION_SANDBOX",
    sourceAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    destinationAddress: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    destinationTag: 971001,
    xrpAmountDecimal: "60682.681633",
    deliveredCurrency: "AED",
    deliveredValue: "546000.00",
    paymentReference: "PAY-2026-90999",
    invoiceNumber: "INV-DXB-2026-8841",
    aircraftTailNumber: "N789AS",
    airportIcao: "OMDB",
  });

  assert.strictEqual(
    simRecord.txHash,
    null,
    "Simulated XRPL records must NEVER fabricate an on-chain txHash"
  );
  assert.ok(
    simRecord.simulationTraceId?.startsWith("SIM-XRPL-"),
    "Simulation trace ID must be explicitly prefixed with SIM-XRPL-"
  );
  assert.strictEqual(simRecord.executionClassification, "SIMULATED_PAYMENT");
  assert.strictEqual(simRecord.validatedOnLedger, false);

  const simVerify = await verifyXrplTransactionOnLedger(
    simRecord.simulationTraceId!,
    "SIMULATION_SANDBOX"
  );
  assert.strictEqual(simVerify.verifiedOnChain, false);
  console.log(
    "✔ [2/7] XRPL Service Layer & Simulation Isolation (no fake hashes) verified."
  );

  // 3. XRPL Balance & Reserve Calculation
  const balanceInfo = await fetchXrplAccountBalance(
    "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "SIMULATION_SANDBOX",
    "1425000000000"
  );
  assert.strictEqual(balanceInfo.xrpBalanceDecimal, "1425000.000000");
  assert.strictEqual(balanceInfo.baseReserveXrp, "1.000000");
  assert.strictEqual(balanceInfo.isSimulated, true);
  console.log("✔ [3/7] XRPL Account Reserve & Balance calculation verified.");

  // 4. Modular Payment Adapters & Supported vs. Unsupported Corridors
  const dxbQuote = generateModularPaymentQuote({
    sourceCurrency: "USD",
    destinationCurrency: "AED",
    sourceAmount: "100000.00",
    settlementRail: "XRPL_BRIDGE",
  });
  assert.strictEqual(dxbQuote.corridorSupported, true);
  assert.strictEqual(dxbQuote.bridgeAsset, "XRP");
  assert.ok(Number(dxbQuote.destinationAmount) > 360000);

  const unsupportedKztQuote = generateModularPaymentQuote({
    sourceCurrency: "USD",
    destinationCurrency: "KZT",
    sourceAmount: "50000.00",
    settlementRail: "XRPL_BRIDGE",
  });
  assert.strictEqual(
    unsupportedKztQuote.corridorSupported,
    false,
    "USD -> KZT must be flagged as unsupported on XRPL Bridge"
  );
  console.log(
    "✔ [4/7] Modular Payment Rails & Corridor Constraint validation verified."
  );

  // 5. Role-Based Access Control (RBAC) across all 5 Aviation Roles
  const db = createInitialSeedDatabase();
  assert.strictEqual(db.users.length, 5, "All 5 RBAC roles must be seeded");

  db.activeUserId = "usr_cfo_01";
  assert.strictEqual(
    checkActiveUserPermission(db, "canApprovePayment").allowed,
    true
  );
  assert.strictEqual(
    checkActiveUserPermission(db, "canManageUsers").allowed,
    true
  );

  db.activeUserId = "usr_op_04";
  assert.strictEqual(
    checkActiveUserPermission(db, "canCreatePayment").allowed,
    true
  );
  assert.strictEqual(
    checkActiveUserPermission(db, "canApprovePayment").allowed,
    false,
    "Finance Operator must not be allowed to approve payments"
  );

  db.activeUserId = "usr_au_05";
  assert.strictEqual(
    checkActiveUserPermission(db, "canCreatePayment").allowed,
    false
  );
  assert.strictEqual(
    checkActiveUserPermission(db, "canExportAuditLogs").allowed,
    true
  );
  console.log("✔ [5/7] Role-Based Access Control (5 enterprise roles) verified.");

  // 6. Immutable SHA-256 Hash-Chained Audit Trail
  const prevTopHash = db.auditLogs[0].integrityHash;
  const newLog = appendAuditLog(db, {
    action: "TEST_AUDIT_EVENT",
    entityType: "PAYMENT",
    entityId: "pay_test_99",
    summary: "Verified cryptographic hash chain integrity.",
  });
  assert.notStrictEqual(newLog.integrityHash, prevTopHash);
  assert.ok(newLog.metadataJson.includes(prevTopHash));
  console.log("✔ [6/7] Immutable SHA-256 Hash-Chained Audit Trail verified.");

  // 7. End-to-End API Route Integration Test (/api/platform and /api/xrpl)
  await postPlatform(
    new NextRequest("http://localhost:3070/api/platform", {
      method: "POST",
      body: JSON.stringify({ action: "RESET_DEMO_DATA" }),
    })
  );

  const initialRes = await getPlatform();
  const initialData = await initialRes.json();
  assert.strictEqual(initialRes.status, 200);
  assert.strictEqual(initialData.beneficiaries.length, 6);
  assert.strictEqual(initialData.invoices.length, 5);

  // Create a payment linked to invoice inv_dxb_fuel_101 and settle immediately
  const payRes = await postPlatform(
    new NextRequest("http://localhost:3070/api/platform", {
      method: "POST",
      body: JSON.stringify({
        action: "CREATE_PAYMENT",
        beneficiaryId: "ben_dubai_fuel_01",
        invoiceId: "inv_dxb_fuel_101",
        invoiceNumber: "INV-DXB-2026-8841",
        sourceCurrency: "USD",
        destinationCurrency: "AED",
        sourceAmount: "148672.57",
        settlementRail: "XRPL_BRIDGE",
        aircraftTailNumber: "N789AS",
        airportIcao: "OMDB",
        forceImmediateAuthorizedExecution: true,
      }),
    })
  );
  const payJson = await payRes.json();
  assert.strictEqual(payRes.status, 200);
  assert.strictEqual(payJson.payment.status, "COMPLETED");
  assert.strictEqual(payJson.payment.xrplRecord.txHash, null);
  assert.ok(payJson.payment.xrplRecord.simulationTraceId.startsWith("SIM-XRPL-"));

  // Verify the linked invoice is now reconciled (PAID)
  const afterPayRes = await getPlatform();
  const afterPayData = await afterPayRes.json();
  const reconciledInvoice = afterPayData.invoices.find(
    (i: { id: string }) => i.id === "inv_dxb_fuel_101"
  );
  assert.strictEqual(
    reconciledInvoice.status,
    "PAID",
    "Linked invoice must automatically reconcile to PAID"
  );

  // Test /api/xrpl GET and POST
  const xrplGetRes = await getXrpl(
    new NextRequest("http://localhost:3070/api/xrpl?network=SIMULATION_SANDBOX")
  );
  assert.strictEqual(xrplGetRes.status, 200);

  const xrplVerifyRes = await postXrpl(
    new NextRequest("http://localhost:3070/api/xrpl", {
      method: "POST",
      body: JSON.stringify({
        action: "VERIFY_HASH",
        txHash: payJson.payment.xrplRecord.simulationTraceId,
      }),
    })
  );
  const xrplVerifyJson = await xrplVerifyRes.json();
  assert.strictEqual(xrplVerifyJson.verification.verifiedOnChain, false);

  // Reset back to clean initial demo state
  await postPlatform(
    new NextRequest("http://localhost:3070/api/platform", {
      method: "POST",
      body: JSON.stringify({ action: "RESET_DEMO_DATA" }),
    })
  );

  console.log(
    "✔ [7/7] End-to-End REST API (/api/platform & /api/xrpl) & Invoice Reconciliation verified.\n=== ALL 7 ACCEPTANCE & INTEGRATION SUITES PASSED ==="
  );
}

runAcceptanceSuite().catch((err) => {
  console.error("Acceptance suite failed:", err);
  process.exit(1);
});
