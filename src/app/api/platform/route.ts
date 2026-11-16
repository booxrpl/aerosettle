import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { DecimalMoney } from "@/lib/decimal";
import {
  appendAuditLog,
  checkActiveUserPermission,
  createInitialSeedDatabase,
  loadDatabase,
  saveDatabase,
} from "@/db/store";
import {
  AVIATION_SETTLEMENT_CORRIDORS,
  convertCurrencyAmount,
  generateModularPaymentQuote,
  USD_FX_RATES,
} from "@/services/payment-rails";
import {
  buildXrplSettlementRecord,
  isValidXrplClassicAddress,
} from "@/services/xrpl-service";
import {
  AviationCategory,
  BeneficiaryRecord,
  ExecutionClassification,
  InvoiceLineItemRecord,
  InvoiceRecord,
  PaymentRecord,
  SettlementRail,
  TransactionLedgerRecord,
  XrplNetworkMode,
} from "@/types/aerosettle";

export async function GET() {
  const db = loadDatabase();
  const activeUser =
    db.users.find((u) => u.id === db.activeUserId) || db.users[0];
  const activePermissions =
    db.rolePermissions.find((rp) => rp.role === activeUser.role) ||
    db.rolePermissions[0];

  // Compute Executive KPIs using precise DecimalMoney arithmetic
  let totalVolumeUsd = DecimalMoney.zero();
  let completedCount = 0;
  let pendingCount = 0;
  let totalSettlementSec = 0;

  for (const p of db.payments) {
    if (p.status === "COMPLETED") {
      totalVolumeUsd = totalVolumeUsd.add(
        DecimalMoney.fromString(p.usdEquivalent)
      );
      completedCount++;
      totalSettlementSec += p.settlementDurationSec || 15;
    } else if (
      p.status === "AWAITING_APPROVAL" ||
      p.status === "PENDING_SETTLEMENT" ||
      p.status === "PROCESSING"
    ) {
      pendingCount++;
    }
  }

  let totalTreasuryUsd = DecimalMoney.zero();
  for (const acc of db.treasuryAccounts) {
    totalTreasuryUsd = totalTreasuryUsd.add(
      DecimalMoney.fromString(acc.usdEquivalent)
    );
  }

  let outstandingPayablesUsd = DecimalMoney.zero();
  for (const inv of db.invoices) {
    if (inv.status !== "PAID") {
      outstandingPayablesUsd = outstandingPayablesUsd.add(
        DecimalMoney.fromString(inv.usdEquivalent)
      );
    }
  }

  const avgSettlementSec =
    completedCount > 0 ? Math.round(totalSettlementSec / completedCount) : 15;

  return NextResponse.json({
    ...db,
    activeUser,
    activePermissions,
    corridors: AVIATION_SETTLEMENT_CORRIDORS,
    fxRates: USD_FX_RATES,
    kpis: {
      totalVolumeUsd: totalVolumeUsd.toFixed(2),
      totalPaymentsSentUsd: totalVolumeUsd.toFixed(2),
      totalPaymentsReceivedUsd: "1842500.00", // Codeshare & ACMI wet-lease inflows
      completedPaymentsCount: completedCount,
      pendingPaymentsCount: pendingCount,
      averageSettlementSec: avgSettlementSec,
      totalTreasuryUsd: totalTreasuryUsd.toFixed(2),
      outstandingPayablesUsd: outstandingPayablesUsd.toFixed(2),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    let db = loadDatabase();

    if (action === "RESET_DEMO_DATA") {
      db = createInitialSeedDatabase();
      saveDatabase(db);
      return NextResponse.json({ ok: true, message: "Demo database reset." });
    }

    if (action === "SWITCH_ROLE_USER") {
      const targetUser = db.users.find((u) => u.id === body.userId);
      if (!targetUser) {
        return NextResponse.json(
          { error: "Selected user not found." },
          { status: 400 }
        );
      }
      db.activeUserId = targetUser.id;
      appendAuditLog(db, {
        action: "AUTH_SESSION_ROLE_SWITCHED",
        entityType: "AUTH",
        entityId: targetUser.id,
        summary: `Switched active authenticated session to ${targetUser.fullName} (${targetUser.role}).`,
      });
      saveDatabase(db);
      return NextResponse.json({ ok: true, activeUser: targetUser });
    }

    if (action === "SWITCH_XRPL_NETWORK") {
      const mode = body.networkMode as XrplNetworkMode;
      db.xrplNetworkMode = mode;
      appendAuditLog(db, {
        action: "XRPL_NETWORK_MODE_CHANGED",
        entityType: "WALLET",
        entityId: db.wallets[0]?.id || "wal_xrpl",
        summary: `Switched XRPL service layer network target to ${mode}.`,
      });
      saveDatabase(db);
      return NextResponse.json({ ok: true, xrplNetworkMode: mode });
    }

    if (action === "CREATE_QUOTE") {
      const quote = generateModularPaymentQuote({
        sourceCurrency: body.sourceCurrency || "USD",
        destinationCurrency: body.destinationCurrency || "AED",
        sourceAmount: String(body.sourceAmount || "10000"),
        settlementRail: (body.settlementRail || "XRPL_BRIDGE") as SettlementRail,
      });
      return NextResponse.json({ ok: true, quote });
    }

    if (action === "CREATE_PAYMENT") {
      const perm = checkActiveUserPermission(db, "canCreatePayment");
      if (!perm.allowed) {
        return NextResponse.json(
          {
            error: `Access Denied: Role '${perm.user.role}' does not have permission to initiate payments.`,
          },
          { status: 403 }
        );
      }

      const beneficiary = db.beneficiaries.find(
        (b) => b.id === body.beneficiaryId
      );
      if (!beneficiary) {
        return NextResponse.json(
          { error: "Beneficiary not found." },
          { status: 400 }
        );
      }

      if (beneficiary.sanctionsStatus === "BLOCKED") {
        return NextResponse.json(
          {
            error:
              "Compliance Block: Beneficiary failed sanctions screening and cannot receive disbursements.",
          },
          { status: 403 }
        );
      }

      const sourceAmountMoney = DecimalMoney.fromString(body.sourceAmount || "0");
      if (!sourceAmountMoney.greaterThan(DecimalMoney.zero())) {
        return NextResponse.json(
          { error: "Payment amount must be greater than zero." },
          { status: 400 }
        );
      }

      const settlementRail = (body.settlementRail ||
        "XRPL_BRIDGE") as SettlementRail;
      const quote = generateModularPaymentQuote({
        sourceCurrency: body.sourceCurrency || "USD",
        destinationCurrency:
          body.destinationCurrency || beneficiary.defaultCurrency,
        sourceAmount: sourceAmountMoney.toFixed(2),
        settlementRail,
      });

      if (!quote.corridorSupported) {
        return NextResponse.json(
          {
            error: `Corridor Not Supported on ${settlementRail}: ${quote.corridorNotes}`,
          },
          { status: 400 }
        );
      }

      const conv = convertCurrencyAmount(
        sourceAmountMoney.toFixed(2),
        quote.sourceCurrency,
        quote.destinationCurrency
      );

      const usdEqMoney = DecimalMoney.fromString(conv.usdEquivalent);
      const thresholdMoney = DecimalMoney.fromString(
        db.company.dualControlThresholdUsd
      );
      const needsApproval =
        body.saveAsDraft !== true &&
        (usdEqMoney.greaterThanOrEqual(thresholdMoney) ||
          beneficiary.verificationStatus !== "VERIFIED" ||
          !perm.rolePerm.canApprovePayment);

      const paymentRef = `PAY-2026-${Math.floor(90500 + Math.random() * 8999)}`;
      const paymentId = `pay_${Date.now()}`;
      const nowIso = new Date().toISOString();

      let status: PaymentRecord["status"] = "COMPLETED";
      let executionClassification: ExecutionClassification =
        "SIMULATED_PAYMENT";
      let xrplRecord = undefined;
      let externalBankRef: string | undefined = undefined;
      let settlementDurationSec: number | undefined = quote.estimatedTimeSec;

      if (body.saveAsDraft) {
        status = "DRAFT";
      } else if (needsApproval && !body.forceImmediateAuthorizedExecution) {
        status = "AWAITING_APPROVAL";
      } else {
        status = "COMPLETED";
        if (settlementRail === "XRPL_BRIDGE") {
          xrplRecord = buildXrplSettlementRecord({
            walletId: db.wallets[0].id,
            network: db.xrplNetworkMode,
            sourceAddress: db.wallets[0].classicAddress,
            destinationAddress:
              beneficiary.xrplDestinationAddr ||
              "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
            destinationTag: beneficiary.xrplDestinationTag,
            xrpAmountDecimal: quote.bridgeXrpUnits || "1000.000000",
            deliveredCurrency: quote.destinationCurrency,
            deliveredValue: quote.destinationAmount,
            paymentReference: paymentRef,
            invoiceNumber: body.invoiceNumber,
            aircraftTailNumber: body.aircraftTailNumber,
            airportIcao: body.airportIcao || beneficiary.airportIcao,
          });
          executionClassification = xrplRecord.executionClassification;
          externalBankRef = `PARTNER-OFFRAMP-${Date.now().toString().slice(-6)}`;
        } else {
          executionClassification = "COMPLETED_EXTERNAL_FIAT_SETTLEMENT";
          externalBankRef = `${settlementRail}-REF-${Date.now().toString().slice(-6)}`;
        }
      }

      const newPayment: PaymentRecord = {
        id: paymentId,
        paymentReference: paymentRef,
        companyId: db.company.id,
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.tradingName,
        beneficiaryCountry: beneficiary.countryName,
        beneficiaryCategory: beneficiary.category,
        initiatorUserId: perm.user.id,
        initiatorName: perm.user.fullName,
        quoteId: quote.id,
        invoiceId: body.invoiceId || undefined,
        invoiceNumber: body.invoiceNumber || undefined,
        sourceCurrency: quote.sourceCurrency,
        sourceAmount: quote.sourceAmount,
        destinationCurrency: quote.destinationCurrency,
        destinationAmount: quote.destinationAmount,
        usdEquivalent: conv.usdEquivalent,
        exchangeRate: quote.appliedRate,
        totalFeeUsd: quote.totalFeeUsd,
        settlementRail,
        status,
        executionClassification,
        purposeCode: body.purposeCode || "AVIATION_SUPPLIER_SETTLEMENT",
        aircraftTailNumber: body.aircraftTailNumber || "N789AS",
        airportIcao: body.airportIcao || beneficiary.airportIcao,
        memoText:
          body.memoText ||
          `Settlement to ${beneficiary.tradingName} (${beneficiary.airportIcao})`,
        requiresDualApproval: usdEqMoney.greaterThanOrEqual(thresholdMoney),
        requiredApprovalsCount: usdEqMoney.greaterThanOrEqual(thresholdMoney)
          ? 1
          : 1,
        approvals:
          status === "COMPLETED"
            ? [
                {
                  id: `app_${Date.now()}`,
                  paymentId,
                  approverId: perm.user.id,
                  approverName: perm.user.fullName,
                  approverRole: perm.user.role,
                  decision: "APPROVED",
                  comment: "Authorized executive creation & release.",
                  signature: `SIG-SHA256-${crypto
                    .createHash("sha256")
                    .update(paymentId)
                    .digest("hex")
                    .slice(0, 10)
                    .toUpperCase()}`,
                  decidedAt: nowIso,
                },
              ]
            : [],
        xrplRecord,
        externalBankRef,
        settlementDurationSec,
        submittedAt: status === "DRAFT" ? undefined : nowIso,
        completedAt: status === "COMPLETED" ? nowIso : undefined,
        createdAt: nowIso,
      };

      db.payments.unshift(newPayment);

      if (status === "COMPLETED") {
        // Reconcile linked invoice if provided
        if (body.invoiceId) {
          const inv = db.invoices.find((i) => i.id === body.invoiceId);
          if (inv) {
            inv.status = "PAID";
            inv.matchedPaymentId = newPayment.id;
          }
        }

        const txRecord: TransactionLedgerRecord = {
          id: `tx_${Date.now()}`,
          transactionReference: `TXN-AS-${paymentRef.replace("PAY-", "")}`,
          paymentId: newPayment.id,
          paymentReference: newPayment.paymentReference,
          companyId: db.company.id,
          beneficiaryId: beneficiary.id,
          senderName: db.company.legalName,
          recipientName: beneficiary.tradingName,
          recipientCountry: beneficiary.countryName,
          recipientCategory: beneficiary.category,
          airportIcao: newPayment.airportIcao || beneficiary.airportIcao,
          aircraftTailNumber: newPayment.aircraftTailNumber,
          invoiceNumber: newPayment.invoiceNumber,
          sourceCurrency: newPayment.sourceCurrency,
          sourceAmount: newPayment.sourceAmount,
          destinationCurrency: newPayment.destinationCurrency,
          destinationAmount: newPayment.destinationAmount,
          usdEquivalent: newPayment.usdEquivalent,
          exchangeRate: newPayment.exchangeRate,
          feeAmountUsd: newPayment.totalFeeUsd,
          settlementRail: newPayment.settlementRail,
          status: "COMPLETED",
          executionClassification: newPayment.executionClassification,
          settlementDurationSec: quote.estimatedTimeSec,
          externalBankRef: newPayment.externalBankRef,
          xrplTxHash: xrplRecord?.txHash ?? null,
          simulationTraceId: xrplRecord?.simulationTraceId ?? null,
          xrplRecord,
          createdAt: nowIso,
          settledAt: nowIso,
        };
        db.transactions.unshift(txRecord);
      }

      appendAuditLog(db, {
        action:
          status === "COMPLETED"
            ? "PAYMENT_CREATED_AND_SETTLED"
            : `PAYMENT_CREATED_${status}`,
        entityType: "PAYMENT",
        entityId: newPayment.id,
        summary: `Created ${paymentRef} (${quote.sourceCurrency} ${quote.sourceAmount} -> ${quote.destinationCurrency} ${quote.destinationAmount}) to ${beneficiary.tradingName} via ${settlementRail} [Status: ${status}].`,
      });

      saveDatabase(db);
      return NextResponse.json({ ok: true, payment: newPayment, quote });
    }

    if (action === "APPROVE_OR_REJECT_PAYMENT") {
      const perm = checkActiveUserPermission(db, "canApprovePayment");
      if (!perm.allowed) {
        return NextResponse.json(
          {
            error: `Access Denied: Role '${perm.user.role}' cannot approve or reject queued payments.`,
          },
          { status: 403 }
        );
      }

      const payment = db.payments.find((p) => p.id === body.paymentId);
      if (!payment) {
        return NextResponse.json(
          { error: "Payment not found." },
          { status: 404 }
        );
      }

      const decision = body.decision === "REJECTED" ? "REJECTED" : "APPROVED";
      const nowIso = new Date().toISOString();

      payment.approvals.push({
        id: `app_${Date.now()}`,
        paymentId: payment.id,
        approverId: perm.user.id,
        approverName: perm.user.fullName,
        approverRole: perm.user.role,
        decision,
        comment:
          body.comment ||
          (decision === "APPROVED"
            ? "Dual-control verification passed; settlement released."
            : "Cancelled by approver."),
        signature: `SIG-SHA256-${crypto
          .createHash("sha256")
          .update(`${payment.id}:${perm.user.id}:${nowIso}`)
          .digest("hex")
          .slice(0, 10)
          .toUpperCase()}`,
        decidedAt: nowIso,
      });

      if (decision === "REJECTED") {
        payment.status = "CANCELLED";
      } else {
        payment.status = "COMPLETED";
        payment.submittedAt = nowIso;
        payment.completedAt = nowIso;
        payment.settlementDurationSec = 14;

        const beneficiary = db.beneficiaries.find(
          (b) => b.id === payment.beneficiaryId
        );

        if (payment.settlementRail === "XRPL_BRIDGE") {
          const xrpUnits = DecimalMoney.fromString(
            payment.usdEquivalent
          ).multiplyByRate((1 / 2.45).toFixed(8));
          const xrplRec = buildXrplSettlementRecord({
            walletId: db.wallets[0].id,
            network: db.xrplNetworkMode,
            sourceAddress: db.wallets[0].classicAddress,
            destinationAddress:
              beneficiary?.xrplDestinationAddr ||
              "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
            destinationTag: beneficiary?.xrplDestinationTag,
            xrpAmountDecimal: xrpUnits.toFixed(6),
            deliveredCurrency: payment.destinationCurrency,
            deliveredValue: payment.destinationAmount,
            paymentReference: payment.paymentReference,
            invoiceNumber: payment.invoiceNumber,
            aircraftTailNumber: payment.aircraftTailNumber,
            airportIcao: payment.airportIcao,
          });
          payment.xrplRecord = xrplRec;
          payment.executionClassification = xrplRec.executionClassification;
          payment.externalBankRef = `SEPA-INST-${Date.now().toString().slice(-6)}`;
        } else {
          payment.executionClassification =
            "COMPLETED_EXTERNAL_FIAT_SETTLEMENT";
          payment.externalBankRef = `WIRE-${Date.now().toString().slice(-6)}`;
        }

        if (payment.invoiceId) {
          const inv = db.invoices.find((i) => i.id === payment.invoiceId);
          if (inv) {
            inv.status = "PAID";
            inv.matchedPaymentId = payment.id;
          }
        }

        const txRecord: TransactionLedgerRecord = {
          id: `tx_${Date.now()}`,
          transactionReference: `TXN-AS-${payment.paymentReference.replace("PAY-", "")}`,
          paymentId: payment.id,
          paymentReference: payment.paymentReference,
          companyId: db.company.id,
          beneficiaryId: payment.beneficiaryId,
          senderName: db.company.legalName,
          recipientName: payment.beneficiaryName,
          recipientCountry: payment.beneficiaryCountry,
          recipientCategory: payment.beneficiaryCategory,
          airportIcao: payment.airportIcao || "EDDF",
          aircraftTailNumber: payment.aircraftTailNumber,
          invoiceNumber: payment.invoiceNumber,
          sourceCurrency: payment.sourceCurrency,
          sourceAmount: payment.sourceAmount,
          destinationCurrency: payment.destinationCurrency,
          destinationAmount: payment.destinationAmount,
          usdEquivalent: payment.usdEquivalent,
          exchangeRate: payment.exchangeRate,
          feeAmountUsd: payment.totalFeeUsd,
          settlementRail: payment.settlementRail,
          status: "COMPLETED",
          executionClassification: payment.executionClassification,
          settlementDurationSec: 14,
          externalBankRef: payment.externalBankRef,
          xrplTxHash: payment.xrplRecord?.txHash ?? null,
          simulationTraceId: payment.xrplRecord?.simulationTraceId ?? null,
          xrplRecord: payment.xrplRecord,
          createdAt: nowIso,
          settledAt: nowIso,
        };
        db.transactions.unshift(txRecord);
      }

      appendAuditLog(db, {
        action: `PAYMENT_${decision}`,
        entityType: "PAYMENT",
        entityId: payment.id,
        summary: `${perm.user.fullName} (${perm.user.role}) ${decision} ${payment.paymentReference} (${payment.destinationCurrency} ${payment.destinationAmount} to ${payment.beneficiaryName}).`,
      });

      saveDatabase(db);
      return NextResponse.json({ ok: true, payment });
    }

    if (action === "COMPLETE_PENDING_SETTLEMENT") {
      const payment = db.payments.find((p) => p.id === body.paymentId);
      if (!payment) {
        return NextResponse.json(
          { error: "Payment not found." },
          { status: 404 }
        );
      }
      const nowIso = new Date().toISOString();
      payment.status = "COMPLETED";
      payment.completedAt = nowIso;
      payment.settlementDurationSec = 26;
      payment.externalBankRef = `PIX-BACEN-${Date.now().toString().slice(-6)}`;
      payment.executionClassification = "SIMULATED_PAYMENT";

      if (payment.invoiceId) {
        const inv = db.invoices.find((i) => i.id === payment.invoiceId);
        if (inv) {
          inv.status = "PAID";
          inv.matchedPaymentId = payment.id;
        }
      }

      const existingTx = db.transactions.find(
        (t) => t.paymentId === payment.id
      );
      if (existingTx) {
        existingTx.status = "COMPLETED";
        existingTx.settledAt = nowIso;
        existingTx.externalBankRef = payment.externalBankRef;
      }

      appendAuditLog(db, {
        action: "PENDING_SETTLEMENT_CONFIRMED",
        entityType: "PAYMENT",
        entityId: payment.id,
        summary: `Partner off-ramp confirmation received for ${payment.paymentReference} (${payment.externalBankRef}). Reconciled invoice ${payment.invoiceNumber || "N/A"}.`,
      });

      saveDatabase(db);
      return NextResponse.json({ ok: true, payment });
    }

    if (action === "CREATE_BENEFICIARY") {
      const perm = checkActiveUserPermission(db, "canManageSuppliers");
      if (!perm.allowed) {
        return NextResponse.json(
          {
            error: `Access Denied: Role '${perm.user.role}' cannot add or modify supplier records.`,
          },
          { status: 403 }
        );
      }

      if (
        body.xrplDestinationAddr &&
        !isValidXrplClassicAddress(body.xrplDestinationAddr)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid XRPL classic address format (must start with 'r' and be 25-35 base58 characters).",
          },
          { status: 400 }
        );
      }

      const newBen: BeneficiaryRecord = {
        id: `ben_${Date.now()}`,
        companyId: db.company.id,
        legalName: body.legalName,
        tradingName: body.tradingName || body.legalName,
        countryCode: body.countryCode || "AE",
        countryName: body.countryName || "United Arab Emirates",
        city: body.city || "Dubai",
        airportIcao: (body.airportIcao || "OMDB").toUpperCase(),
        category: (body.category || "FUEL_SUPPLIER") as AviationCategory,
        defaultCurrency: body.defaultCurrency || "AED",
        ibanOrAccount: body.ibanOrAccount || "AE0703300000123456789",
        swiftBic: (body.swiftBic || "EBILAEADXXX").toUpperCase(),
        bankName: body.bankName || "International Aviation Bank",
        xrplDestinationAddr: body.xrplDestinationAddr || undefined,
        xrplDestinationTag: body.xrplDestinationTag
          ? Number(body.xrplDestinationTag)
          : undefined,
        supportedRails: body.supportedRails || ["XRPL_BRIDGE", "SWIFT_GPI"],
        contactName: body.contactName || "Aviation Treasury Desk",
        contactEmail: body.contactEmail || "billing@supplier.demo",
        contactPhone: body.contactPhone || "+1 555 0199",
        verificationStatus: "VERIFIED",
        sanctionsStatus: "CLEARED",
        lastScreenedAt: new Date().toISOString(),
        supplierProfile: {
          faaEasaCertNumber: body.faaEasaCertNumber || undefined,
          iataFuelCode: body.iataFuelCode || undefined,
          groundHandlingStations: [
            (body.airportIcao || "OMDB").toUpperCase(),
          ],
          paymentTermsDays: Number(body.paymentTermsDays || 30),
          preferredSettlementRail: "XRPL_BRIDGE",
          lifetimeVolumeUsd: "0.00",
          averageSettlementSec: 15,
          reliabilityScore: "99.50",
        },
        createdAt: new Date().toISOString(),
      };

      db.beneficiaries.unshift(newBen);
      appendAuditLog(db, {
        action: "SUPPLIER_BENEFICIARY_ADDED",
        entityType: "BENEFICIARY",
        entityId: newBen.id,
        summary: `Added verified aviation beneficiary ${newBen.tradingName} (${newBen.airportIcao}, ${newBen.countryName}) with OFAC/EU sanctions clearance.`,
      });
      saveDatabase(db);
      return NextResponse.json({ ok: true, beneficiary: newBen });
    }

    if (action === "CREATE_INVOICE") {
      const perm = checkActiveUserPermission(db, "canCreateInvoice");
      if (!perm.allowed) {
        return NextResponse.json(
          {
            error: `Access Denied: Role '${perm.user.role}' cannot create or upload invoices.`,
          },
          { status: 403 }
        );
      }

      const beneficiary = db.beneficiaries.find(
        (b) => b.id === body.beneficiaryId
      );
      if (!beneficiary) {
        return NextResponse.json(
          { error: "Supplier beneficiary not found." },
          { status: 400 }
        );
      }

      const rawItems = Array.isArray(body.lineItems) ? body.lineItems : [];
      let subtotal = DecimalMoney.zero();
      const computedLineItems: InvoiceLineItemRecord[] = rawItems.map(
        (item: {
          description: string;
          skuOrPartNum?: string;
          quantity: string | number;
          unit: string;
          unitPrice: string | number;
        }, idx: number) => {
          const unitPriceMoney = DecimalMoney.fromString(item.unitPrice || "0");
          const lineTotalMoney = unitPriceMoney.multiplyByQuantity(
            item.quantity || "1"
          );
          subtotal = subtotal.add(lineTotalMoney);
          return {
            id: `li_${Date.now()}_${idx}`,
            description: item.description || "Aviation Service Line Item",
            skuOrPartNum: item.skuOrPartNum || "AV-ITEM-01",
            quantity: String(item.quantity || "1"),
            unit: item.unit || "EA",
            unitPrice: unitPriceMoney.toFixed(6),
            lineTotal: lineTotalMoney.toFixed(2),
          };
        }
      );

      const taxRateBps = Number(body.taxRateBps || 0);
      const taxMoney = subtotal.multiplyByBps(taxRateBps);
      const totalMoney = subtotal.add(taxMoney);
      const currency = body.currency || beneficiary.defaultCurrency;
      const conv = convertCurrencyAmount(
        totalMoney.toFixed(2),
        currency,
        "USD"
      );

      const docName =
        body.documentFileName ||
        `${beneficiary.tradingName.replace(/\s+/g, "_")}_${body.invoiceNumber}.pdf`;
      const docHash = crypto
        .createHash("sha256")
        .update(`${body.invoiceNumber}:${totalMoney.toFixed(2)}:${docName}`)
        .digest("hex")
        .toUpperCase();

      const newInvoice: InvoiceRecord = {
        id: `inv_${Date.now()}`,
        companyId: db.company.id,
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.tradingName,
        beneficiaryCategory: beneficiary.category,
        beneficiaryCountry: beneficiary.countryName,
        invoiceNumber:
          body.invoiceNumber ||
          `INV-${beneficiary.airportIcao}-${Math.floor(1000 + Math.random() * 9000)}`,
        direction: "PAYABLE",
        currency,
        subtotalAmount: subtotal.toFixed(2),
        taxAmount: taxMoney.toFixed(2),
        totalAmount: totalMoney.toFixed(2),
        usdEquivalent: conv.usdEquivalent,
        issueDate: body.issueDate || new Date().toISOString().slice(0, 10),
        dueDate:
          body.dueDate ||
          new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: "OUTSTANDING",
        aircraftTailNumber: body.aircraftTailNumber || "N789AS",
        flightNumber: body.flightNumber || "AG-402",
        airportIcao: body.airportIcao || beneficiary.airportIcao,
        documentFileName: docName,
        documentHashSha256: docHash,
        notes: body.notes || "",
        lineItems: computedLineItems,
        createdAt: new Date().toISOString(),
      };

      db.invoices.unshift(newInvoice);
      appendAuditLog(db, {
        action: "INVOICE_CREATED",
        entityType: "INVOICE",
        entityId: newInvoice.id,
        summary: `Registered supplier invoice ${newInvoice.invoiceNumber} (${newInvoice.currency} ${newInvoice.totalAmount}) from ${beneficiary.tradingName}.`,
      });
      saveDatabase(db);
      return NextResponse.json({ ok: true, invoice: newInvoice });
    }

    if (action === "UPDATE_COMPANY_SETTINGS") {
      const perm = checkActiveUserPermission(db, "canManageUsers");
      if (!perm.allowed) {
        return NextResponse.json(
          {
            error: `Access Denied: Only Administrators can modify company governance settings.`,
          },
          { status: 403 }
        );
      }

      if (body.legalName) db.company.legalName = body.legalName;
      if (body.primaryHubAirport)
        db.company.primaryHubAirport = body.primaryHubAirport.toUpperCase();
      if (body.dualControlThresholdUsd) {
        db.company.dualControlThresholdUsd = DecimalMoney.fromString(
          body.dualControlThresholdUsd
        ).toFixed(2);
      }
      if (typeof body.requireDualApprovalOnXrpl === "boolean") {
        db.company.requireDualApprovalOnXrpl = body.requireDualApprovalOnXrpl;
      }

      appendAuditLog(db, {
        action: "COMPANY_GOVERNANCE_UPDATED",
        entityType: "SETTINGS",
        entityId: db.company.id,
        summary: `Updated company profile & approval governance (Dual-Control Threshold: $${db.company.dualControlThresholdUsd} USD).`,
      });
      saveDatabase(db);
      return NextResponse.json({ ok: true, company: db.company });
    }

    return NextResponse.json(
      { error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
