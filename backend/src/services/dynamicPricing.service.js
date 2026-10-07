// ============================================================
// DYNAMIC PRICING SERVICE
// ============================================================

const prisma = require('../lib/prisma');
const {
  computeDynamicProductPrice,
  computeLockExpiry,
  isLockExpired,
  shouldReconfirm,
} = require('../lib/dynamicPricing');

// ============================================================
// DECIMAL CONVERSION HELPER
// ============================================================
//
// Prisma Decimals arrive as one of:
//   1. Plain number → use as-is
//   2. String → parse
//   3. Decimal.js instance → .toNumber()
//   4. Serialized { s, e, d } → reconstruct
//
function decimalToNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);

  if (typeof value.toNumber === 'function') {
    return value.toNumber();
  }

  if (
    typeof value === 'object' &&
    's' in value &&
    'e' in value &&
    Array.isArray(value.d)
  ) {
    const sign = value.s >= 0 ? 1 : -1;
    const digits = value.d.join('');
    const exp = value.e;
    const num = sign * Number(digits) * Math.pow(10, exp - digits.length + 1);
    return num;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ============================================================
// LOOKUP HELPERS
// ============================================================

async function getLiveMetalRates() {
  const rates = await prisma.metalRate.findMany({
    where: { isActive: true },
  });

  const map = {};
  for (const r of rates) {
    const karat = r.karat ?? 0;
    const suffix = karat > 0 ? `${karat}K` : '0';
    const key = `${r.metal}_${suffix}`;
    map[key] = decimalToNumber(r.ratePerGram);
  }
  return map;
}

async function getStoreSettings() {
  const settings = await prisma.storeSettings.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return {
    taxRate: decimalToNumber(settings?.taxRate) || 3,
    priceLockEnabled: settings?.priceLockEnabled ?? true,
    priceLockDuration: settings?.priceLockDuration ?? 30,
    priceLockDurationUnit: settings?.priceLockDurationUnit ?? 'minutes',
    priceLockReconfirmThreshold:
      decimalToNumber(settings?.priceLockReconfirmThreshold) || 2.0,
  };
}

/**
 * Normalize a ProductComponent row from Prisma so all Decimal
 * fields are plain numbers. The pure engine can then do simple math.
 */
function normalizeComponent(component) {
  return {
    ...component,
    baseWeightGrams: decimalToNumber(component.baseWeightGrams),
    wastagePercentage: decimalToNumber(component.wastagePercentage),
    makingChargeValue: decimalToNumber(component.makingChargeValue),
    stoneWeightGrams: decimalToNumber(component.stoneWeightGrams),
    // gemstones is Json — safe to pass through
  };
}

/**
 * Normalize a SizingWeightRule row from Prisma.
 */
function normalizeSizingRule(rule) {
  return {
    ...rule,
    weightSurgeGrams: decimalToNumber(rule.weightSurgeGrams),
  };
}

async function getDynamicProductConfig(productId) {
  const dynamicProduct = await prisma.dynamicProduct.findUnique({
    where: { productId },
    include: {
      components: { orderBy: { displayOrder: 'asc' } },
      sizingRules: true,
    },
  });

  if (!dynamicProduct || !dynamicProduct.isActive) {
    return null;
  }

  return {
    dynamicProduct: {
      id: dynamicProduct.id,
      type: dynamicProduct.type,
      bundleDiscountPct: decimalToNumber(dynamicProduct.bundleDiscountPct),
      priceLockEnabledOverride: dynamicProduct.priceLockEnabledOverride,
      priceLockDurationOverride: dynamicProduct.priceLockDurationOverride,
      priceLockDurationUnitOverride:
        dynamicProduct.priceLockDurationUnitOverride,
    },
    components: dynamicProduct.components.map(normalizeComponent),
    sizingRules: dynamicProduct.sizingRules.map(normalizeSizingRule),
  };
}

// ============================================================
// TOP-LEVEL: COMPUTE PRICE
// ============================================================

async function calculatePrice(productId, configuration = {}, opts = {}) {
  const config = await getDynamicProductConfig(productId);
  if (!config) return null;

  const [liveRates, settings] = await Promise.all([
    getLiveMetalRates(),
    getStoreSettings(),
  ]);

  const result = computeDynamicProductPrice(
    config.components,
    config.sizingRules,
    configuration,
    liveRates,
    {
      taxRate: settings.taxRate,
      bundleDiscountPct: config.dynamicProduct.bundleDiscountPct,
      skippedComponents: opts.skippedComponents || [],
    }
  );

  return {
    ...result,
    productId,
    dynamicProductId: config.dynamicProduct.id,
    type: config.dynamicProduct.type,
  };
}

// ============================================================
// PRICE LOCK
// ============================================================

async function createPriceLock(productId, computedPrice) {
  const settings = await getStoreSettings();
  const config = await getDynamicProductConfig(productId);

  const enabled =
    config?.dynamicProduct?.priceLockEnabledOverride ?? settings.priceLockEnabled;

  const duration =
    config?.dynamicProduct?.priceLockDurationOverride ?? settings.priceLockDuration;

  const unit =
    config?.dynamicProduct?.priceLockDurationUnitOverride ??
    settings.priceLockDurationUnit;

  const lockedUntil = computeLockExpiry(enabled, duration, unit);
  const now = new Date();

  return {
    lockedPrice: computedPrice,
    lockedAt: enabled ? now : null,
    lockedUntil,
  };
}

async function calculatePriceWithLock(cartItem) {
  if (!cartItem.configuration) {
    return null;
  }

  const settings = await getStoreSettings();
  const fresh = await calculatePrice(
    cartItem.productId,
    cartItem.configuration,
    { skippedComponents: cartItem.skippedComponents || [] }
  );

  if (!fresh) return null;

  const lockedPrice = cartItem.lockedPrice
    ? decimalToNumber(cartItem.lockedPrice)
    : null;
  const lockValid = lockedPrice !== null && !isLockExpired(cartItem.lockedUntil);

  if (lockValid) {
    return {
      currentPrice: fresh.total,
      lockedPrice,
      lockedUntil: cartItem.lockedUntil,
      isLockValid: true,
      isStale: false,
      needsReconfirm: false,
      deltaPct: 0,
      effectivePrice: lockedPrice,
      breakdown: fresh,
    };
  }

  const deltaPct = lockedPrice
    ? Math.abs((fresh.total - lockedPrice) / lockedPrice) * 100
    : 0;

  const needsReconfirm = lockedPrice
    ? shouldReconfirm(lockedPrice, fresh.total, settings.priceLockReconfirmThreshold)
    : false;

  return {
    currentPrice: fresh.total,
    lockedPrice,
    lockedUntil: cartItem.lockedUntil,
    isLockValid: false,
    isStale: true,
    needsReconfirm,
    deltaPct: Math.round(deltaPct * 100) / 100,
    effectivePrice: fresh.total,
    breakdown: fresh,
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  decimalToNumber,
  getLiveMetalRates,
  getStoreSettings,
  getDynamicProductConfig,
  calculatePrice,
  createPriceLock,
  calculatePriceWithLock,
};