// ============================================================
// SHARED DECIMAL HELPERS
// Convert any value (number, string, Prisma Decimal, or
// serialized { s, e, d } shape) to a plain number.
// ============================================================

function toNum(val) {
  if (val == null) return 0;

  // Plain number
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : 0;
  }

  // Numeric string
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : 0;
  }

  if (typeof val !== 'object') return 0;

  // Path 1: real Prisma.Decimal with .toNumber()
  if (typeof val.toNumber === 'function') {
    try {
      const n = val.toNumber();
      if (Number.isFinite(n)) return n;
    } catch (_) { /* fall through */ }
  }

  // Path 2: decimal.js serialized { s, e, d }
  //   `d` is an array of base-10^7 limbs (each limb is a 7-digit chunk).
  //   The value = sign × (d[0] + d[1]/10^7 + d[2]/10^14 + ...)
  //   Example: { s: 1, e: 5, d: [121769, 6900000] } → 121769.69
  if (Array.isArray(val.d) && val.d.length > 0) {
    const LOG_BASE = 7;
    const sign = val.s === -1 ? -1 : 1;

    let result = Number(val.d[0]) || 0;
    for (let i = 1; i < val.d.length; i++) {
      result += (Number(val.d[i]) || 0) / Math.pow(10, LOG_BASE * i);
    }

    const n = sign * result;
    if (Number.isFinite(n)) return n;
  }

  // Path 3: object with a numeric `valueOf`
  if (typeof val.valueOf === 'function' && val.valueOf !== Object.prototype.valueOf) {
    try {
      const n = Number(val.valueOf());
      if (Number.isFinite(n)) return n;
    } catch (_) { /* fall through */ }
  }

  // Path 4: last resort — try to parse from String(val)
  try {
    const s = String(val);
    if (s && s !== '[object Object]') {
      const n = parseFloat(s);
      if (Number.isFinite(n)) return n;
    }
  } catch (_) { /* fall through */ }

  return 0;
}

function toNumOrNull(val) {
  if (val == null) return null;
  const n = toNum(val);
  return Number.isFinite(n) ? n : null;
}

module.exports = { toNum, toNumOrNull };