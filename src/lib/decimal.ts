/**
 * AeroSettle Precise Decimal Financial Arithmetic Library
 * Stores and computes all monetary values using scaled BigInt fixed-point representation
 * (6 decimal places for monetary values = micro-units, matching XRP drops 1 XRP = 1,000,000 drops;
 *  8 decimal places for FX exchange rates).
 * Prevents IEEE-754 floating-point rounding errors in financial calculations.
 */

const MONEY_SCALE = 6n;
const MONEY_FACTOR = 1_000_000n; // 10^6 (also 1 XRP = 1,000,000 drops)
const RATE_SCALE = 8n;
const RATE_FACTOR = 100_000_000n; // 10^8

export class DecimalMoney {
  private readonly microUnits: bigint;

  private constructor(microUnits: bigint) {
    this.microUnits = microUnits;
  }

  static fromString(value: string | number): DecimalMoney {
    const clean = String(value).replace(/,/g, "").trim();
    if (!clean || clean === ".") return new DecimalMoney(0n);
    const isNegative = clean.startsWith("-");
    const normalized = isNegative ? clean.slice(1) : clean;
    const [wholePart = "0", fracPart = ""] = normalized.split(".");
    const paddedFrac = (fracPart + "000000").slice(0, 6);
    const wholeBig = BigInt(wholePart || "0") * MONEY_FACTOR;
    const fracBig = BigInt(paddedFrac || "0");
    const total = wholeBig + fracBig;
    return new DecimalMoney(isNegative ? -total : total);
  }

  static fromMicroUnits(micro: bigint): DecimalMoney {
    return new DecimalMoney(micro);
  }

  static zero(): DecimalMoney {
    return new DecimalMoney(0n);
  }

  add(other: DecimalMoney): DecimalMoney {
    return new DecimalMoney(this.microUnits + other.microUnits);
  }

  subtract(other: DecimalMoney): DecimalMoney {
    return new DecimalMoney(this.microUnits - other.microUnits);
  }

  multiplyByQuantity(qtyStr: string | number): DecimalMoney {
    // qty scaled by 10^4
    const clean = String(qtyStr).replace(/,/g, "").trim();
    const [w = "0", f = ""] = clean.split(".");
    const qtyScaled = BigInt(w || "0") * 10000n + BigInt((f + "0000").slice(0, 4));
    const product = (this.microUnits * qtyScaled + 5000n) / 10000n;
    return new DecimalMoney(product);
  }

  multiplyByRate(rateStr: string | number): DecimalMoney {
    const clean = String(rateStr).replace(/,/g, "").trim();
    const [w = "0", f = ""] = clean.split(".");
    const rateScaled = BigInt(w || "0") * RATE_FACTOR + BigInt((f + "00000000").slice(0, 8));
    const product = (this.microUnits * rateScaled + RATE_FACTOR / 2n) / RATE_FACTOR;
    return new DecimalMoney(product);
  }

  multiplyByBps(bps: number): DecimalMoney {
    const bpsBig = BigInt(Math.round(bps));
    const product = (this.microUnits * bpsBig + 5000n) / 10000n;
    return new DecimalMoney(product);
  }

  greaterThanOrEqual(other: DecimalMoney): boolean {
    return this.microUnits >= other.microUnits;
  }

  greaterThan(other: DecimalMoney): boolean {
    return this.microUnits > other.microUnits;
  }

  toDropsString(): string {
    return this.microUnits.toString();
  }

  toFixed(decimals: number = 2): string {
    const isNeg = this.microUnits < 0n;
    const abs = isNeg ? -this.microUnits : this.microUnits;
    const whole = abs / MONEY_FACTOR;
    const frac = abs % MONEY_FACTOR;
    const fracStrFull = frac.toString().padStart(Number(MONEY_SCALE), "0");
    if (decimals <= 0) {
      return `${isNeg ? "-" : ""}${whole.toString()}`;
    }
    const sliced = fracStrFull.slice(0, decimals).padEnd(decimals, "0");
    return `${isNeg ? "-" : ""}${whole.toString()}.${sliced}`;
  }

  toDatabaseDecimal(): string {
    return this.toFixed(6);
  }

  toFormattedCurrency(currency: string = "USD", decimals: number = 2): string {
    const fixed = this.toFixed(decimals);
    const [whole, frac] = fixed.split(".");
    const isNeg = whole.startsWith("-");
    const digits = isNeg ? whole.slice(1) : whole;
    const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      AED: "AED ",
      SGD: "S$",
      BRL: "R$",
      GBP: "£",
      JPY: "¥",
      CHF: "CHF ",
      XRP: "XRP ",
      RLUSD: "RLUSD ",
    };
    const prefix = symbols[currency] ?? `${currency} `;
    return `${isNeg ? "-" : ""}${prefix}${withCommas}${frac ? `.${frac}` : ""}`;
  }
}

export function formatDecimalCurrency(
  amountStr: string | number,
  currency: string = "USD",
  decimals: number = 2
): string {
  return DecimalMoney.fromString(amountStr).toFormattedCurrency(currency, decimals);
}
