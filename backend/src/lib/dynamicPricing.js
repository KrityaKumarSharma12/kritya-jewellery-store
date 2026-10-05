// ============================================================
// DYNAMIC PRODUCT PRICING ENGINE (Haath Phool, Couple Bands, Bridal Set)
// ============================================================
//
// This module is intentionally PURE — no database calls, no async,
// no side effects. Every function takes plain objects and returns
// plain objects.
//
// All business logic lives here. The service layer (Step 3) will
// fetch data from the DB and pass it in. The order service will
// call the same functions to recompute prices before checkout.
//
// Money is handled as numbers (not Prisma.Decimal). The service
// layer converts Decimal → number before calling in, and converts
// back to Decimal when writing to the DB.
// ============================================================

const GRAMS_PER_CARAT = 0.2;

// ============================================================
// HELPERS
// ============================================================

/**
 * Rounds to 2 decimal places (paise). Uses a small epsilon to
 * avoid the classic 0.1 + 0.2 = 0.30000000000000004 problem.
 */
function money(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Rounds to 3 decimal places (milligrams). Weights in jewellery
 * are tracked to 3 decimals.
 */
function weight(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
}

/**
 * Given a metal lookup ({ "GOLD_22K": 8983, ... }), find the rate.
 * Returns a plain number.
 */
function getMetalRate(liveRates, metalType, purity) {
  const key = `${metalType}_${purity}`;
  const rate = liveRates[key];
  if (rate === undefined || rate === null) {
    throw new Error(`Live metal rate not found for: ${key}`);
  }
  return Number(rate);
}

// ============================================================
// COMPONENT-LEVEL PRICING
// ============================================================

/**
 * Compute price for ONE component (e.g. the ring, or the bridge).
 *
 * @param {Object} component - A ProductComponent row (already fetched)
 * @param {string} selectedSize - e.g. "size_8" or "4.5_inch"
 * @param {Array} sizingRules - All SizingWeightRule rows for this component's dynamic product
 * @param {Object} liveRates - { "GOLD_22K": 8983, "SILVER_0": 120, ... }
 * @param {number} taxRate - e.g. 3 for 3% GST. Used only to compute the
 *                           embedded tax, not to add on top.
 *
 * @returns {Object} Breakdown
 */
function computeComponentPrice(component, selectedSize, sizingRules, liveRates, taxRate = 3) {
  // 1. Weight surge lookup --------------------------------------
  let weightSurgeGrams = 0;
  if (selectedSize) {
    const rule = sizingRules.find(
      (r) => r.componentKey === component.componentKey && r.sizeOption === selectedSize
    );
    if (rule) weightSurgeGrams = Number(rule.weightSurgeGrams);
  }

  // 2. Weight calculations --------------------------------------
  const baseWeight = Number(component.baseWeightGrams);
  const grossWeight = weight(baseWeight + weightSurgeGrams);

  // Stone weight: precomputed on the component, in grams
  const stoneWeight = Number(component.stoneWeightGrams || 0);

  // Net gold weight = gross weight − stone weight
  const netWeight = weight(Math.max(0, grossWeight - stoneWeight));

  // Wastage: applied only to net gold weight
  const wastagePct = Number(component.wastagePercentage || 0);
  const wastageWeight = weight(netWeight * (wastagePct / 100));
  const totalChargedWeight = weight(netWeight + wastageWeight);

  // 3. Metal cost -----------------------------------------------
  const liveRate = getMetalRate(liveRates, component.metalType, component.purity);
  const metalCost = money(totalChargedWeight * liveRate);

  // 4. Gemstone cost --------------------------------------------
  // gemstones is a JSON array: [
  //   { name, type, carats, ratePerCarat, settingCharge, count, isCluster, zone }
  // ]
  const gemstoneList = Array.isArray(component.gemstones) ? component.gemstones : [];
  let gemstoneCost = 0;
  const gemstoneBreakdown = gemstoneList.map((g) => {
    const carats = Number(g.carats || 0);
    const ratePerCarat = Number(g.ratePerCarat || 0);
    const count = Number(g.count || 1);
    const settingCharge = Number(g.settingCharge || 0);

    const materialCost = carats * ratePerCarat;
    const settingCost = count * settingCharge;
    const lineTotal = materialCost + settingCost;

    gemstoneCost += lineTotal;

    return {
      name: g.name,
      type: g.type,
      zone: g.zone,
      carats,
      materialCost: money(materialCost),
      settingCost: money(settingCost),
      lineTotal: money(lineTotal),
    };
  });
  gemstoneCost = money(gemstoneCost);

  // 5. Making charges (labor) — 3-way switch --------------------
  const mcType = component.makingChargeType || 'PER_GRAM';
  const mcValue = Number(component.makingChargeValue || 0);
  let laborCost = 0;

  switch (mcType) {
    case 'PER_GRAM':
      laborCost = money(netWeight * mcValue);
      break;
    case 'FLAT':
      laborCost = money(mcValue);
      break;
    case 'PERCENTAGE':
      // Percentage of the METAL cost only (industry standard)
      laborCost = money(metalCost * (mcValue / 100));
      break;
    default:
      throw new Error(`Unknown makingChargeType: ${mcType}`);
  }

  // 6. Component total (pre-tax) --------------------------------
  const componentTotal = money(metalCost + gemstoneCost + laborCost);

  // 7. Extract embedded GST (informational) ---------------------
  // The price ALREADY includes GST — we just compute the portion.
  // Formula: embeddedTax = inclusive − inclusive / (1 + rate/100)
  const embeddedTax = money(componentTotal - componentTotal / (1 + taxRate / 100));

  return {
    componentKey: component.componentKey,
    name: component.name,
    zone: component.zone,

    // Weights (grams, 3 decimals)
    baseWeightGrams: weight(baseWeight),
    weightSurgeGrams: weight(weightSurgeGrams),
    grossWeightGrams: grossWeight,
    stoneWeightGrams: weight(stoneWeight),
    netWeightGrams: netWeight,
    wastageWeightGrams: wastageWeight,
    totalChargedWeightGrams: totalChargedWeight,

    // Rates
    metalType: component.metalType,
    purity: component.purity,
    liveRatePerGram: liveRate,
    wastagePercentage: wastagePct,
    makingChargeType: mcType,
    makingChargeValue: mcValue,

    // Money breakdown
    metalCost,
    gemstoneCost,
    gemstoneBreakdown,
    laborCost,
    componentTotal,
    embeddedTax,
  };
}

// ============================================================
// PRODUCT-LEVEL PRICING
// ============================================================

/**
 * Compute total price for a dynamic product given the customer's
 * size configuration.
 *
 * @param {Array} components - ProductComponent rows
 * @param {Array} sizingRules - SizingWeightRule rows
 * @param {Object} configuration - { ring: "size_8", bridge: "4.5_inch", ... }
 * @param {Object} liveRates - { "GOLD_22K": 8983, ... }
 * @param {Object} options - { taxRate, bundleDiscountPct, skippedComponents }
 *
 * @returns {Object} Total price + per-component breakdown
 */
function computeDynamicProductPrice(
  components,
  sizingRules,
  configuration = {},
  liveRates = {},
  options = {}
) {
  const {
    taxRate = 3,
    bundleDiscountPct = 0,
    skippedComponents = [], // array of componentKey strings the user deselected
  } = options;

  const componentBreakdowns = [];
  let subtotal = 0;

  for (const component of components) {
    // Skip optional components the user excluded
    if (skippedComponents.includes(component.componentKey)) continue;
    // Skip purely optional components that weren't configured
    if (component.isOptional && !configuration[component.componentKey]) continue;

    const selectedSize = configuration[component.componentKey];
    const breakdown = computeComponentPrice(
      component,
      selectedSize,
      sizingRules,
      liveRates,
      taxRate
    );

    componentBreakdowns.push(breakdown);
    subtotal += breakdown.componentTotal;
  }

  subtotal = money(subtotal);

  // Bundle discount (only meaningful for COUPLE_BANDS / BRIDAL_SET)
  const discount = money(subtotal * (bundleDiscountPct / 100));
  const totalAfterDiscount = money(subtotal - discount);

  // Embedded GST on the post-discount total
  const embeddedTax = money(
    totalAfterDiscount - totalAfterDiscount / (1 + taxRate / 100)
  );

  return {
    subtotal,
    bundleDiscountPct,
    discount,
    totalAfterDiscount,
    // Total is what the customer pays (already GST-inclusive)
    total: totalAfterDiscount,
    embeddedTax,
    taxRate,
    componentBreakdowns,
  };
}

// ============================================================
// PRICE-LOCK HELPERS
// ============================================================

/**
 * Compute the expiry timestamp for a price lock.
 * Returns null if lock is disabled.
 *
 * @param {boolean} lockEnabled
 * @param {number} duration - e.g. 30
 * @param {string} unit - "minutes" | "hours" | "days"
 * @returns {Date|null}
 */
function computeLockExpiry(lockEnabled, duration, unit) {
  if (!lockEnabled) return null;

  const now = new Date();
  const ms = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  }[unit] || 60 * 1000;

  return new Date(now.getTime() + duration * ms);
}

/**
 * Is a price lock expired?
 */
function isLockExpired(lockedUntil) {
  if (!lockedUntil) return true;
  return new Date(lockedUntil).getTime() <= Date.now();
}

/**
 * Given an old price and a new price, is the delta big enough to
 * require the customer to reconfirm?
 *
 * @param {number} oldPrice
 * @param {number} newPrice
 * @param {number} thresholdPct - e.g. 2 for 2%
 * @returns {boolean}
 */
function shouldReconfirm(oldPrice, newPrice, thresholdPct) {
  if (!oldPrice || oldPrice <= 0) return false;
  const delta = Math.abs(newPrice - oldPrice);
  const deltaPct = (delta / oldPrice) * 100;
  return deltaPct > thresholdPct;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  computeComponentPrice,
  computeDynamicProductPrice,
  computeLockExpiry,
  isLockExpired,
  shouldReconfirm,
  // Expose for testing
  _internal: { money, weight, GRAMS_PER_CARAT },
};