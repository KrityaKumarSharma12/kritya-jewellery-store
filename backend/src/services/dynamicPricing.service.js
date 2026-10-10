// ============================================================
// DYNAMIC PRICING SERVICE
// ============================================================

const prisma = require('../lib/prisma');
const {
  computeDynamicProductPrice,
  computeMultiPiecePrice,
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
// SIZE-OPTION LABEL HUMANIZER
// ============================================================
//
// Turns raw size keys into human-readable labels for the UI:
//   size_7       → "Size 7"
//   finger_middle → "Middle finger"
//   6.5_inch     → "6.5 inch"
//
function humanizeSizeOption(sizeOption) {
  if (!sizeOption || typeof sizeOption !== 'string') return '';

  if (sizeOption.startsWith('size_')) {
    return `Size ${sizeOption.slice(5)}`;
  }

  if (sizeOption.startsWith('finger_')) {
    const finger = sizeOption.slice(7);
    return `${finger.charAt(0).toUpperCase()}${finger.slice(1)} finger`;
  }

  if (sizeOption.endsWith('_inch')) {
    return sizeOption.replace('_inch', ' inch');
  }

  return sizeOption;
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
    // availablePurities is String[] — safe to pass through
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

// ============================================================
// GET DYNAMIC PRODUCT CONFIG (with sizingOptions + puritiesByComponent)
// ============================================================

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

  // -------- Build sizingOptions grouped by componentKey --------
  // Shape:
  //   {
  //     ring:     [{ value, label, isDefault, weightSurgeGrams }, ...],
  //     bridge:   [...],
  //     bracelet: [...],
  //   }
  const sizingOptions = {};
  for (const rule of dynamicProduct.sizingRules) {
    const key = rule.componentKey;
    if (!sizingOptions[key]) sizingOptions[key] = [];
    sizingOptions[key].push({
      value: rule.sizeOption,
      label: humanizeSizeOption(rule.sizeOption),
      isDefault: rule.isDefault ?? false,
      weightSurgeGrams: decimalToNumber(rule.weightSurgeGrams),
    });
  }
  // Sort each list alphabetically so the UI is stable across requests
  for (const key of Object.keys(sizingOptions)) {
    sizingOptions[key].sort((a, b) => a.value.localeCompare(b.value));
  }

  // -------- Build puritiesByComponent (union across same componentKey) --------
  // Shape:
  //   {
  //     ring:     ['9K', '14K', '18K', '22K'],
  //     bridge:   ['9K', '14K', '18K', '22K'],
  //     medallion:['9K', '14K', '18K', '22K'],
  //     bracelet: ['9K', '14K', '18K', '22K'],
  //   }
  const puritiesByComponent = {};
  for (const c of dynamicProduct.components) {
    const key = c.componentKey;
    const list = Array.isArray(c.availablePurities) ? c.availablePurities : [];
    if (!puritiesByComponent[key]) puritiesByComponent[key] = new Set();
    list.forEach((p) => puritiesByComponent[key].add(p));
  }
  const PURITY_ORDER = ['9K', '14K', '18K', '22K', '24K'];
  Object.keys(puritiesByComponent).forEach((key) => {
    puritiesByComponent[key] = [...puritiesByComponent[key]].sort(
      (a, b) => PURITY_ORDER.indexOf(a) - PURITY_ORDER.indexOf(b)
    );
  });

  return {
    dynamicProduct: {
      id: dynamicProduct.id,
      type: dynamicProduct.type,
      bundleDiscountPct: decimalToNumber(dynamicProduct.bundleDiscountPct),
      priceLockEnabledOverride: dynamicProduct.priceLockEnabledOverride,
      priceLockDurationOverride: dynamicProduct.priceLockDurationOverride,
      priceLockDurationUnitOverride:
        dynamicProduct.priceLockDurationUnitOverride,
      // caps + finger→length map for the multi-piece engine
      maxRings: dynamicProduct.maxRings ?? 5,
      maxChainsPerRing: dynamicProduct.maxChainsPerRing ?? 1,
      maxMedallions: dynamicProduct.maxMedallions ?? 1,
      chainLengthByFinger: dynamicProduct.chainLengthByFinger || {},
    },
    components: dynamicProduct.components.map(normalizeComponent),
    sizingRules: dynamicProduct.sizingRules.map(normalizeSizingRule),
    sizingOptions,
    puritiesByComponent,   // ✅ NEW
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

  // Route based on config shape:
  //   v3 (multi-piece) → configuration.rings is an array
  //   v1 (legacy flat) → configuration.ring is a string
  const isMultiPiece = Array.isArray(configuration.rings);

  const engineOptions = {
    taxRate: settings.taxRate,
    bundleDiscountPct: config.dynamicProduct.bundleDiscountPct,
    // v3-only options (harmless to pass to the legacy engine, it ignores them)
    maxRings: config.dynamicProduct.maxRings ?? 5,
    maxMedallions: config.dynamicProduct.maxMedallions ?? 1,
    // legacy option (harmless to pass to the v3 engine, it ignores it)
    skippedComponents: opts.skippedComponents || [],
  };

  const result = isMultiPiece
    ? computeMultiPiecePrice(
        config.components,
        config.sizingRules,
        configuration,
        liveRates,
        engineOptions
      )
    : computeDynamicProductPrice(
        config.components,
        config.sizingRules,
        configuration,
        liveRates,
        engineOptions
      );

  return {
    ...result,
    productId,
    dynamicProductId: config.dynamicProduct.id,
    type: config.dynamicProduct.type,
    configVersion: isMultiPiece ? 3 : 1,
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
  humanizeSizeOption,
  getLiveMetalRates,
  getStoreSettings,
  getDynamicProductConfig,
  calculatePrice,
  createPriceLock,
  calculatePriceWithLock,
};