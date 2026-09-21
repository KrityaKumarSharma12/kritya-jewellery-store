const masterDataService = require('../services/masterData.service');

class MasterDataController {
  // ============ JEWELLERY TYPES ============
  async getJewelleryTypes(req, res) {
    try {
      const types = await masterDataService.getJewelleryTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createJewelleryType(req, res) {
    try {
      const type = await masterDataService.createJewelleryType(req.body);
      res.status(201).json(type);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============ COLLECTIONS ============
  async getCollections(req, res) {
    try {
      const collections = await masterDataService.getCollections();
      res.json(collections);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createCollection(req, res) {
    try {
      const collection = await masterDataService.createCollection(req.body);
      res.status(201).json(collection);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============ OCCASIONS ============
  async getOccasions(req, res) {
    try {
      const occasions = await masterDataService.getOccasions();
      res.json(occasions);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createOccasion(req, res) {
    try {
      const occasion = await masterDataService.createOccasion(req.body);
      res.status(201).json(occasion);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============ PRODUCT STYLES ============
  async getProductStyles(req, res) {
    try {
      const styles = await masterDataService.getProductStyles();
      res.json(styles);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createProductStyle(req, res) {
    try {
      const style = await masterDataService.createProductStyle(req.body);
      res.status(201).json(style);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============ KARIGARS ============
  async getKarigars(req, res) {
    try {
      const karigars = await masterDataService.getKarigars();
      res.json(karigars);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createKarigar(req, res) {
    try {
      const karigar = await masterDataService.createKarigar(req.body);
      res.status(201).json(karigar);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============ METALS (static) ============
  async getMetals(req, res) {
    res.json(masterDataService.getMetals());
  }

  // ============ METAL COLORS (static) ============
  async getMetalColors(req, res) {
    res.json(masterDataService.getMetalColors());
  }

  // ============ PRODUCT SIZES ============
  async getProductSizes(req, res) {
    try {
      const sizes = await masterDataService.getProductSizes();
      res.json(sizes);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============ GEMSTONES (static) ============
  async getGemstones(req, res) {
    res.json(masterDataService.getGemstones());
  }
}

module.exports = new MasterDataController();