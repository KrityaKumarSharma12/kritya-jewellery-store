const prisma = require('../lib/prisma');

const DEFAULT_SETTINGS = {
  storeName: "Kritya's Jewellery",
  storeEmail: 'info@kritiyasjewellery.com',
  storePhone: '+91 98765 43210',
  storeAddress: '123 Jewellery Lane, Mumbai, India',
  currency: 'INR',
  taxRate: 3.0,
  shippingCost: 0,
  freeShippingAbove: 5000,
  paymentMethods: ['COD', 'CARD', 'UPI', 'NETBANKING'],
  notificationEmail: true,
  notificationSMS: false,
  returnDays: 7,
  isActive: true,
};

class SettingsService {
  // ============== INTERNAL: FIND OR CREATE ==============
  async _findOrCreate() {
    let settings = await prisma.storeSettings.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!settings) {
      settings = await prisma.storeSettings.create({ data: DEFAULT_SETTINGS });
    }

    return settings;
  }

  // ============== PUBLIC (safe fields only) ==============
  async getPublicSettings() {
    try {
      const settings = await this._findOrCreate();

      return {
        storeName: settings.storeName,
        storeEmail: settings.storeEmail,
        storePhone: settings.storePhone,
        storeAddress: settings.storeAddress,
        currency: settings.currency,
        taxRate: settings.taxRate,
        shippingCost: settings.shippingCost,
        freeShippingAbove: settings.freeShippingAbove,
        paymentMethods: settings.paymentMethods,
        returnDays: settings.returnDays,
        returnPolicy: settings.returnPolicy,
      };
    } catch (error) {
      console.error('Error fetching public settings:', error);
      // Never throw for the public endpoint — return safe defaults
      return {
        storeName: "Kritya's Jewellery",
        storeEmail: 'info@kritiyasjewellery.com',
        storePhone: '+91 98765 43210',
        storeAddress: '123 Jewellery Lane, Mumbai, India',
        currency: 'INR',
        taxRate: 3.0,
        shippingCost: 0,
        freeShippingAbove: 5000,
        paymentMethods: ['COD', 'CARD', 'UPI', 'NETBANKING'],
        returnDays: 7,
      };
    }
  }

  // ============== FULL SETTINGS (admin) ==============
  async getSettings() {
    return this._findOrCreate();
  }

  // ============== UPDATE ==============
  async updateSettings(body) {
    const existing = await prisma.storeSettings.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const payload = {
      storeName: body.storeName || DEFAULT_SETTINGS.storeName,
      storeEmail: body.storeEmail || DEFAULT_SETTINGS.storeEmail,
      storePhone: body.storePhone || DEFAULT_SETTINGS.storePhone,
      storeAddress: body.storeAddress || DEFAULT_SETTINGS.storeAddress,
      currency: body.currency || DEFAULT_SETTINGS.currency,
      taxRate: parseFloat(body.taxRate) || 3.0,
      shippingCost: parseFloat(body.shippingCost) || 0,
      freeShippingAbove: parseFloat(body.freeShippingAbove) || 5000,
      paymentMethods: body.paymentMethods || DEFAULT_SETTINGS.paymentMethods,
      notificationEmail: body.notificationEmail !== false,
      notificationSMS: body.notificationSMS === true,
      returnDays: parseInt(body.returnDays) || 7,
      returnPolicy: body.returnPolicy || null,
    };

    if (!existing) {
      return prisma.storeSettings.create({ data: payload });
    }

    return prisma.storeSettings.update({
      where: { id: existing.id },
      data: payload,
    });
  }
}

module.exports = new SettingsService();