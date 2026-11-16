import { NextRequest, NextResponse } from "next/server";
import { loadDatabase } from "@/db/store";
import {
  fetchXrplAccountBalance,
  verifyXrplTransactionOnLedger,
  XRPL_ENDPOINTS,
} from "@/services/xrpl-service";
import { XrplNetworkMode } from "@/types/aerosettle";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const db = loadDatabase();
  const network =
    (searchParams.get("network") as XrplNetworkMode) || db.xrplNetworkMode;
  const address =
    searchParams.get("address") ||
    db.wallets[0]?.classicAddress ||
    "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";

  const accountInfo = await fetchXrplAccountBalance(
    address,
    network,
    db.wallets[0]?.xrpBalanceDrops || "1425000000000"
  );

  return NextResponse.json({
    ok: true,
    endpoints: XRPL_ENDPOINTS,
    accountInfo,
    wallets: db.wallets,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = loadDatabase();
    const network =
      (body.network as XrplNetworkMode) || db.xrplNetworkMode;

    if (body.action === "VERIFY_HASH") {
      const result = await verifyXrplTransactionOnLedger(
        String(body.txHash || ""),
        network
      );
      return NextResponse.json({ ok: true, verification: result });
    }

    if (body.action === "QUERY_BALANCE") {
      const accountInfo = await fetchXrplAccountBalance(
        String(body.address || db.wallets[0].classicAddress),
        network,
        db.wallets[0]?.xrpBalanceDrops || "1425000000000"
      );
      return NextResponse.json({ ok: true, accountInfo });
    }

    return NextResponse.json(
      { error: "Unknown XRPL service action" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "XRPL service error",
      },
      { status: 500 }
    );
  }
}
