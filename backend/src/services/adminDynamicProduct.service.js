// ============================================================
// ADMIN: DYNAMIC PRODUCT SERVICE
// ============================================================
//
// CRUD + validation for DynamicProduct, ProductComponent, and
// SizingWeightRule rows. Used by the admin panel to configure
// Haath Phool / Couple Bands / Bridal Sets.
//
// All errors thrown here carry `statusCode` so the controller can
// respond with the right HTTP code.

const prisma = require('../lib/prisma');

// -------- Valid enums --------
const VALID_COMPONENT_KEYS = ['ring', 'bridge', 'medallion', 'bracelet'];
const VALID_MAKING_CHARGE_TYPES = ['PER_GRAM', 'FLAT', 'PERCENTAGE'];
const VALID_PRICE_BASIS = ['PER_GRAM', 'PER_CM', 'FLAT'];
const VALID_PURITIES = ['9K', '14K', '18K', '22K', '24K'];
const VALID_DYNAMIC_TYPES = ['HAATH_PHOOL', 'COUPLE_BANDS', 'BRIDAL_SET'];
const VALID_METAL_TYPES = ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'RHODIUM'];

// -------- Helpers --------
const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toRequiredNum = (v, field) => {
  const n = toNum(v);
  if (n === null) fail(`${field} is required and must be a number`);
  if (n < 0) fail(`${field} cannot be negative`);
  return n;
};

const toRequiredInt = (v, field) => {
  const n = Number(v);
  if (!Number.isInteger(n)) fail(`${field} must be an integer`);
  if (n < 0) fail(`${field} cannot be negative`);
  return n;
};

const normalizeComponentData = (input) => {
  const out = {};

  if (input.name !== undefined) out.name = String(input.name).trim();
  if (input.componentKey !== undefined) {
    const k = String(input.componentKey);
    if (!VALID_COMPONENT_KEYS.includes(k)) {
      fail(`Invalid componentKey "${k}". Must be one of: ${VALID_COMPONENT_KEYS.join(', ')}`);
    }
    out.componentKey = k;
  }
  if (input.zone !== undefined) out.zone = input.zone ? String(input.zone) : null;
  if (input.isRepeatable !== undefined) out.isRepeatable = !!input.isRepeatable;
  if (input.maxQuantity !== undefined) {
    out.maxQuantity = toRequiredInt(input.maxQuantity, 'maxQuantity');
    if (out.maxQuantity < 1) fail('maxQuantity must be at least 1');
  }
  if (input.isOptional !== undefined) out.isOptional = !!input.isOptional;
  if (input.styleKey !== undefined) {
    out.styleKey = String(input.styleKey || 'classic').trim() || 'classic';
  }
  if (input.priceBasis !== undefined) {
    const b = String(input.priceBasis);
    if (!VALID_PRICE_BASIS.includes(b)) {
      fail(`Invalid priceBasis "${b}". Must be one of: ${VALID_PRICE_BASIS.join(', ')}`);
    }
    out.priceBasis = b;
  }
  if (input.metalType !== undefined) {
    const m = String(input.metalType).toUpperCase();
    if (!VALID_METAL_TYPES.includes(m)) {
      fail(`Invalid metalType "${m}". Must be one of: ${VALID_METAL_TYPES.join(', ')}`);
    }
    out.metalType = m;
  }
  if (input.purity !== undefined) out.purity = String(input.purity);
  if (input.availablePurities !== undefined) {
    if (!Array.isArray(input.availablePurities)) {
      fail('availablePurities must be an array');
    }
    const cleaned = input.availablePurities.map((p) => String(p));
    for (const p of cleaned) {
      if (!VALID_PURITIES.includes(p)) {
        fail(`Invalid purity "${p}". Must be one of: ${VALID_PURITIES.join(', ')}`);
      }
    }
    out.availablePurities = cleaned;
  }
  if (input.baseWeightGrams !== undefined) {
    out.baseWeightGrams = toRequiredNum(input.baseWeightGrams, 'baseWeightGrams');
  }
  if (input.wastagePercentage !== undefined) {
    const w = toRequiredNum(input.wastagePercentage, 'wastagePercentage');
    if (w > 100) fail('wastagePercentage cannot exceed 100');
    out.wastagePercentage = w;
  }
  if (input.makingChargeType !== undefined) {
    const t = String(input.makingChargeType);
    if (!VALID_MAKING_CHARGE_TYPES.includes(t)) {
      fail(`Invalid makingChargeType "${t}". Must be one of: ${VALID_MAKING_CHARGE_TYPES.join(', ')}`);
    }
    out.makingChargeType = t;
  }
  if (input.makingChargeValue !== undefined) {
    out.makingChargeValue = toRequiredNum(input.makingChargeValue, 'makingChargeValue');
  }
  if (input.gemstones !== undefined) {
    if (!Array.isArray(input.gemstones)) fail('gemstones must be an array');
    out.gemstones = input.gemstones;
  }
  if (input.stoneWeightGrams !== undefined) {
    out.stoneWeightGrams = toRequiredNum(input.stoneWeightGrams, 'stoneWeightGrams');
  }
  if (input.displayOrder !== undefined) {
    out.displayOrder = toRequiredInt(input.displayOrder, 'displayOrder');
  }

  return out;
};

// ============================================================
// SERVICE
// ============================================================
class AdminDynamicProductService {
  // ---------------- List ----------------
  async listAll({ type, isActive } = {}) {
    const where = {};
    if (type && VALID_DYNAMIC_TYPES.includes(type)) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;

    const rows = await prisma.dynamicProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
  select: {
    id: true,
    name: true,
    images: true,
    category: true,
    isActive: true,
    colorMedia: {
      orderBy: { sortOrder: 'asc' },
      select: { url: true, color: true, type: true, isPrimary: true },
    },
  },
},
        _count: { select: { components: true, sizingRules: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      type: r.type,
      isActive: r.isActive,
      maxRings: r.maxRings,
      maxMedallions: r.maxMedallions,
      product: r.product,
      componentCount: r._count.components,
      sizingRuleCount: r._count.sizingRules,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  // ---------------- Get by ID ----------------
  async getById(id) {
    const row = await prisma.dynamicProduct.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            images: true,
            category: true,
            isActive: true,
          },
        },
        components: { orderBy: [{ displayOrder: 'asc' }, { componentKey: 'asc' }] },
        sizingRules: { orderBy: [{ componentKey: 'asc' }, { sizeOption: 'asc' }] },
      },
    });

    if (!row) fail('Dynamic product not found', 404);
    return row;
  }

  // ---------------- Create ----------------
  async create(body) {
    const { productId, type, maxRings, maxChainsPerRing, maxMedallions, chainLengthByFinger, bundleDiscountPct, isActive } = body;

    if (!productId) fail('productId is required');
    if (!type) fail('type is required');
    if (!VALID_DYNAMIC_TYPES.includes(type)) {
      fail(`Invalid type "${type}". Must be one of: ${VALID_DYNAMIC_TYPES.join(', ')}`);
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) fail('Product not found', 404);

    const existing = await prisma.dynamicProduct.findUnique({ where: { productId } });
    if (existing) fail('This product already has a dynamic configuration');

    const created = await prisma.dynamicProduct.create({
      data: {
        productId,
        type,
        maxRings: maxRings !== undefined ? toRequiredInt(maxRings, 'maxRings') : 5,
        maxChainsPerRing: maxChainsPerRing !== undefined ? toRequiredInt(maxChainsPerRing, 'maxChainsPerRing') : 1,
        maxMedallions: maxMedallions !== undefined ? toRequiredInt(maxMedallions, 'maxMedallions') : 1,
        chainLengthByFinger: chainLengthByFinger || {},
        bundleDiscountPct: bundleDiscountPct !== undefined ? toRequiredNum(bundleDiscountPct, 'bundleDiscountPct') : null,
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });

    return created;
  }

  // ---------------- Update (DP level) ----------------
  async update(id, body) {
    const existing = await prisma.dynamicProduct.findUnique({ where: { id } });
    if (!existing) fail('Dynamic product not found', 404);

    const data = {};
    if (body.maxRings !== undefined) data.maxRings = toRequiredInt(body.maxRings, 'maxRings');
    if (body.maxChainsPerRing !== undefined) data.maxChainsPerRing = toRequiredInt(body.maxChainsPerRing, 'maxChainsPerRing');
    if (body.maxMedallions !== undefined) data.maxMedallions = toRequiredInt(body.maxMedallions, 'maxMedallions');
    if (body.chainLengthByFinger !== undefined) {
      if (typeof body.chainLengthByFinger !== 'object' || Array.isArray(body.chainLengthByFinger)) {
        fail('chainLengthByFinger must be an object');
      }
      data.chainLengthByFinger = body.chainLengthByFinger;
    }
    if (body.bundleDiscountPct !== undefined) {
      const n = toNum(body.bundleDiscountPct);
      if (n !== null && (n < 0 || n > 100)) fail('bundleDiscountPct must be between 0 and 100');
      data.bundleDiscountPct = n;
    }
    if (body.isActive !== undefined) data.isActive = !!body.isActive;

    if (Object.keys(data).length === 0) fail('No valid fields to update');

    return prisma.dynamicProduct.update({ where: { id }, data });
  }

  // ---------------- Delete ----------------
  async delete(id) {
    const existing = await prisma.dynamicProduct.findUnique({ where: { id } });
    if (!existing) fail('Dynamic product not found', 404);

    await prisma.dynamicProduct.delete({ where: { id } });
    return { id };
  }

  // ============================================================
  // COMPONENTS
  // ============================================================
  async addComponent(dynamicProductId, body) {
    const dp = await prisma.dynamicProduct.findUnique({ where: { id: dynamicProductId } });
    if (!dp) fail('Dynamic product not found', 404);

    if (!body.componentKey) fail('componentKey is required');
    if (!body.name) fail('name is required');
    if (body.baseWeightGrams === undefined) fail('baseWeightGrams is required');

    const data = normalizeComponentData(body);

    const styleKey = data.styleKey || 'classic';
    const dup = await prisma.productComponent.findFirst({
      where: {
        dynamicProductId,
        componentKey: data.componentKey,
        styleKey,
      },
    });
    if (dup) {
      fail(`A component with key "${data.componentKey}" and style "${styleKey}" already exists for this product`);
    }

    const created = await prisma.productComponent.create({
      data: {
        dynamicProductId,
        componentKey: data.componentKey,
        name: data.name,
        zone: data.zone ?? null,
        isRepeatable: data.isRepeatable ?? false,
        maxQuantity: data.maxQuantity ?? 1,
        isOptional: data.isOptional ?? false,
        styleKey,
        priceBasis: data.priceBasis ?? 'PER_GRAM',
        metalType: data.metalType ?? 'GOLD',
        purity: data.purity ?? '22K',
        availablePurities: data.availablePurities ?? ['9K', '14K', '18K', '22K'],
        baseWeightGrams: data.baseWeightGrams,
        wastagePercentage: data.wastagePercentage ?? 0,
        makingChargeType: data.makingChargeType ?? 'PER_GRAM',
        makingChargeValue: data.makingChargeValue ?? 0,
        gemstones: data.gemstones ?? [],
        stoneWeightGrams: data.stoneWeightGrams ?? 0,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    return created;
  }

  async updateComponent(componentId, body) {
    const existing = await prisma.productComponent.findUnique({ where: { id: componentId } });
    if (!existing) fail('Component not found', 404);

    const data = normalizeComponentData(body);

    if (data.componentKey || data.styleKey) {
      const newKey = data.componentKey || existing.componentKey;
      const newStyle = data.styleKey || existing.styleKey;
      const dup = await prisma.productComponent.findFirst({
        where: {
          dynamicProductId: existing.dynamicProductId,
          componentKey: newKey,
          styleKey: newStyle,
          id: { not: componentId },
        },
      });
      if (dup) {
        fail(`A component with key "${newKey}" and style "${newStyle}" already exists`);
      }
    }

    return prisma.productComponent.update({ where: { id: componentId }, data });
  }

  async deleteComponent(componentId) {
    const existing = await prisma.productComponent.findUnique({ where: { id: componentId } });
    if (!existing) fail('Component not found', 404);

    await prisma.productComponent.delete({ where: { id: componentId } });
    return { id: componentId };
  }

  // ============================================================
  // SIZING RULES
  // ============================================================
  async addSizingRule(dynamicProductId, body) {
    const dp = await prisma.dynamicProduct.findUnique({ where: { id: dynamicProductId } });
    if (!dp) fail('Dynamic product not found', 404);

    if (!body.componentKey) fail('componentKey is required');
    if (!body.sizeOption) fail('sizeOption is required');

    const componentKey = String(body.componentKey);
    if (!VALID_COMPONENT_KEYS.includes(componentKey)) {
      fail(`Invalid componentKey "${componentKey}"`);
    }

    const sizeOption = String(body.sizeOption).trim();
    if (!sizeOption) fail('sizeOption cannot be empty');

    const weightSurgeGrams = body.weightSurgeGrams !== undefined
      ? toRequiredNum(body.weightSurgeGrams, 'weightSurgeGrams')
      : 0;

    const isDefault = !!body.isDefault;

    if (isDefault) {
      await prisma.sizingWeightRule.updateMany({
        where: { dynamicProductId, componentKey, isDefault: true },
        data: { isDefault: false },
      });
    }

    const dup = await prisma.sizingWeightRule.findFirst({
      where: { dynamicProductId, componentKey, sizeOption },
    });
    if (dup) fail(`A rule with sizeOption "${sizeOption}" already exists for "${componentKey}"`);

    return prisma.sizingWeightRule.create({
      data: {
        dynamicProductId,
        componentKey,
        sizeOption,
        weightSurgeGrams,
        isDefault,
      },
    });
  }

  async updateSizingRule(ruleId, body) {
    const existing = await prisma.sizingWeightRule.findUnique({ where: { id: ruleId } });
    if (!existing) fail('Sizing rule not found', 404);

    const data = {};

    if (body.sizeOption !== undefined) {
      const sizeOption = String(body.sizeOption).trim();
      if (!sizeOption) fail('sizeOption cannot be empty');
      data.sizeOption = sizeOption;
    }
    if (body.weightSurgeGrams !== undefined) {
      data.weightSurgeGrams = toRequiredNum(body.weightSurgeGrams, 'weightSurgeGrams');
    }
    if (body.isDefault !== undefined) {
      data.isDefault = !!body.isDefault;
      if (data.isDefault) {
        await prisma.sizingWeightRule.updateMany({
          where: {
            dynamicProductId: existing.dynamicProductId,
            componentKey: existing.componentKey,
            isDefault: true,
            id: { not: ruleId },
          },
          data: { isDefault: false },
        });
      }
    }

    if (Object.keys(data).length === 0) fail('No valid fields to update');

    return prisma.sizingWeightRule.update({ where: { id: ruleId }, data });
  }

  async deleteSizingRule(ruleId) {
    const existing = await prisma.sizingWeightRule.findUnique({ where: { id: ruleId } });
    if (!existing) fail('Sizing rule not found', 404);

    await prisma.sizingWeightRule.delete({ where: { id: ruleId } });
    return { id: ruleId };
  }

  // ============================================================
  // TEST PRICE (uses the same engine as customer path)
  // ============================================================
  async testPrice(dynamicProductId, configuration) {
    const dp = await prisma.dynamicProduct.findUnique({ where: { id: dynamicProductId } });
    if (!dp) fail('Dynamic product not found', 404);

    const dynamicPricing = require('./dynamicPricing.service');
    const result = await dynamicPricing.calculatePrice(dp.productId, configuration, {});
    if (!result) fail('Could not compute price', 500);
    return result;
  }
}

module.exports = new AdminDynamicProductService();