const prisma = require('../lib/prisma');

// Static lookups (no DB) — kept here so the service is the single source
const STATIC_METALS = [
  { value: 'GOLD', label: 'Gold' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'PLATINUM', label: 'Platinum' },
  { value: 'PALLADIUM', label: 'Palladium' },
  { value: 'ROSE_GOLD', label: 'Rose Gold' },
  { value: 'WHITE_GOLD', label: 'White Gold' },
];

const STATIC_METAL_COLORS = [
  { value: 'Rose', label: 'Rose Gold', hex: '#E8B4B8' },
  { value: 'Yellow', label: 'Yellow Gold', hex: '#FFD700' },
  { value: 'White', label: 'White Gold', hex: '#E5E5E5' },
];

const STATIC_GEMSTONES = [
  { value: 'DIAMOND', label: 'Diamond' },
  { value: 'RUBY', label: 'Ruby' },
  { value: 'EMERALD', label: 'Emerald' },
  { value: 'SAPPHIRE', label: 'Sapphire' },
  { value: 'PEARL', label: 'Pearl' },
  { value: 'TOPAZ', label: 'Topaz' },
  { value: 'AMETHYST', label: 'Amethyst' },
  { value: 'NONE', label: 'No Gemstone' },
];

const FALLBACK_SIZES = [
  { value: 'US 5', label: 'US 5' },
  { value: 'US 6', label: 'US 6' },
  { value: 'US 7', label: 'US 7' },
  { value: 'US 8', label: 'US 8' },
  { value: 'US 9', label: 'US 9' },
  { value: 'US 10', label: 'US 10' },
];

class MasterDataService {
  // ============ JEWELLERY TYPES ============
  async getJewelleryTypes() {
    return prisma.jewelleryType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createJewelleryType({ name }) {
    return prisma.jewelleryType.create({ data: { name } });
  }

  // ============ COLLECTIONS ============
  async getCollections() {
    return prisma.collection.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCollection({ name, description, image }) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return prisma.collection.create({
      data: { name, slug, description, image },
    });
  }

  // ============ OCCASIONS ============
  async getOccasions() {
    return prisma.occasion.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createOccasion({ name }) {
    return prisma.occasion.create({ data: { name } });
  }

  // ============ PRODUCT STYLES ============
  async getProductStyles() {
    return prisma.productStyle.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createProductStyle({ name }) {
    return prisma.productStyle.create({ data: { name } });
  }

  // ============ KARIGARS ============
  async getKarigars() {
    return prisma.karigar.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createKarigar({ name, phone, specialization }) {
    return prisma.karigar.create({
      data: { name, phone, specialization },
    });
  }

  // ============ METALS (static) ============
  getMetals() {
    return STATIC_METALS;
  }

  // ============ METAL COLORS (static) ============
  getMetalColors() {
    return STATIC_METAL_COLORS;
  }

  // ============ PRODUCT SIZES ============
  async getProductSizes() {
    try {
      return await prisma.productSize.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (error) {
      return FALLBACK_SIZES;
    }
  }

  // ============ GEMSTONES (static) ============
  getGemstones() {
    return STATIC_GEMSTONES;
  }
}

module.exports = new MasterDataService();