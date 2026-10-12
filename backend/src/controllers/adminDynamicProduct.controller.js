// ============================================================
// ADMIN: DYNAMIC PRODUCT CONTROLLER
// ============================================================

const service = require('../services/adminDynamicProduct.service');

// Recursively convert Prisma serialized Decimals ({s, e, d}) to numbers.
// Handles nested arrays and objects. Applied at the HTTP boundary so
// the frontend always receives plain numbers.
const normalizeDecimals = (value) => {
  if (value === null || value === undefined) return value;

  // Dates pass through unchanged (Express will serialize to ISO strings)
  if (value instanceof Date) return value;

  if (typeof value === 'object') {
    // Serialized Decimal: { s: 1, e: 0, d: [4, 5000000] }  →  4.5
    if ('s' in value && 'e' in value && Array.isArray(value.d)) {
      const sign = value.s >= 0 ? 1 : -1;
      const digits = value.d.join('');
      const exp = value.e;
      return sign * Number(digits) * Math.pow(10, exp - digits.length + 1);
    }

    if (Array.isArray(value)) {
      return value.map(normalizeDecimals);
    }

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeDecimals(v);
    }
    return out;
  }

  return value;
};

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (result !== undefined && !res.headersSent) {
      res.json(normalizeDecimals(result));
    }
  } catch (error) {
    console.error('Admin dynamic product error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

class AdminDynamicProductController {
  // ---------------- Dynamic Product ----------------
  list = handle(async (req) => service.listAll(req.query));
  getById = handle(async (req) => service.getById(req.params.id));
  create = handle(async (req) => {
    const result = await service.create(req.body);
    return { message: 'Dynamic product created', dynamicProduct: result };
  });
  update = handle(async (req) => {
    const result = await service.update(req.params.id, req.body);
    return { message: 'Dynamic product updated', dynamicProduct: result };
  });
  remove = handle(async (req) => {
    const result = await service.delete(req.params.id);
    return { message: 'Dynamic product deleted', ...result };
  });

  // ---------------- Components ----------------
  addComponent = handle(async (req) => {
    const result = await service.addComponent(req.params.id, req.body);
    return { message: 'Component added', component: result };
  });
  updateComponent = handle(async (req) => {
    const result = await service.updateComponent(req.params.componentId, req.body);
    return { message: 'Component updated', component: result };
  });
  removeComponent = handle(async (req) => {
    const result = await service.deleteComponent(req.params.componentId);
    return { message: 'Component deleted', ...result };
  });

  // ---------------- Sizing Rules ----------------
  addSizingRule = handle(async (req) => {
    const result = await service.addSizingRule(req.params.id, req.body);
    return { message: 'Sizing rule added', rule: result };
  });
  updateSizingRule = handle(async (req) => {
    const result = await service.updateSizingRule(req.params.ruleId, req.body);
    return { message: 'Sizing rule updated', rule: result };
  });
  removeSizingRule = handle(async (req) => {
    const result = await service.deleteSizingRule(req.params.ruleId);
    return { message: 'Sizing rule deleted', ...result };
  });

  // ---------------- Test price ----------------
  testPrice = handle(async (req) => {
    const result = await service.testPrice(req.params.id, req.body.configuration || {});
    return result;
  });
}

module.exports = new AdminDynamicProductController();