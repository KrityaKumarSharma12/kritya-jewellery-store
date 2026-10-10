const productService = require('../services/product.service');

class ProductController {
  // ============== GET ALL PRODUCTS ==============
  async getAllProducts(req, res) {
    try {
      const result = await productService.getAllProducts(req.query);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({
        message: 'Server error',
        error: error.message,
        products: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });
    }
  }

  // ============== GET PRODUCT BY ID ==============
  async getProductById(req, res) {
    try {
      const product = await productService.getProductById(req.params.id);
      return res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== GET VARIANT PRICE ==============
  async getVariantPrice(req, res) {
    try {
      const result = await productService.getVariantPrice(req.params.variantId);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching variant price:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== CALCULATE DYNAMIC PRICE ==============
  async calculateDynamicPrice(req, res) {
    try {
      const result = await productService.calculateDynamicPrice(
        req.params.productId,
        req.query
      );
      return res.json(result);
    } catch (error) {
      console.error('❌ Calculate dynamic price error:', error);
      console.error('Stack:', error.stack);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== CREATE PRODUCT ==============
  async createProduct(req, res) {
    try {
      const product = await productService.createProduct(req.body);
      return res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== PREMIUM: CREATE PRODUCT WITH VARIANTS ==============
  async createProductWithVariants(req, res) {
    try {
      const product = await productService.createProductWithVariants(req.body);
      res.status(201).json({
        message: 'Product created successfully',
        product,
      });
    } catch (error) {
      console.error('Create product error:', error);
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== PREMIUM: UPDATE PRODUCT WITH VARIANTS ==============
  async updateProductWithVariants(req, res) {
    try {
      const product = await productService.updateProductWithVariants(req.params.id, req.body);
      res.json({ message: 'Product updated successfully', product });
    } catch (error) {
      console.error('Update product error:', error);
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== UPDATE PRODUCT ==============
  async updateProduct(req, res) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      return res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== DELETE PRODUCT ==============
  async deleteProduct(req, res) {
    try {
      await productService.deleteProduct(req.params.id);
      return res.json({ message: 'Product deactivated successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== DYNAMIC PRODUCT: CONFIG STRUCTURE ==============
  //
  // Returns the shape of a dynamic product so the storefront can
  // render the configurator. No pricing info.
  //
  // Response shape:
  //   {
  //     isDynamic: true,
  //     type: 'HAATH_PHOOL',
  //     bundleDiscountPct: 0,
  //     components: [...],              // flat list, one row per component/variant
  //     sizingOptions: {                // grouped by componentKey
  //       ring:     [{ value, label, isDefault, weightSurgeGrams }, ...],
  //       bridge:   [...],
  //       bracelet: [...],
  //     },
  //     dynamicProduct: {
  //       maxRings, maxChainsPerRing, maxMedallions, chainLengthByFinger
  //     },
  //     defaultConfiguration: {         // v3 shape
  //       version: 3,
  //       hand: 'right',
  //       rings: [{ finger, size, karat }],
  //       medallion: { enabled, styleKey },
  //       bracelet: { size },
  //     }
  //   }
  async getDynamicConfig(req, res) {
    try {
      const dynamicPricing = require('../services/dynamicPricing.service');
      const config = await dynamicPricing.getDynamicProductConfig(req.params.id);

      if (!config) {
        // Not a dynamic product → tell the frontend to render normally.
        return res.json({ isDynamic: false });
      }

            const { dynamicProduct, components, sizingOptions, puritiesByComponent } = config;

      // -------- Build v3 default configuration --------
      // Start with one ring on the middle finger (unlocks the
      // medallion toggle in the UI) and the default bracelet size.
      const ringOpts = sizingOptions.ring || [];
      const braceletOpts = sizingOptions.bracelet || [];

      const defaultRingSize =
        ringOpts.find((o) => o.isDefault)?.value || ringOpts[0]?.value || '';
      const defaultBraceletSize =
        braceletOpts.find((o) => o.isDefault)?.value ||
        braceletOpts[0]?.value ||
        '';

            const defaultConfiguration = {
        version: 3,
        hand: 'right',
        rings: defaultRingSize
          ? [{ finger: 'middle', size: defaultRingSize, karat: '22K' }]
          : [],
        medallion: { enabled: false, styleKey: 'lotus', karat: '22K' },
        bracelet: { size: defaultBraceletSize, karat: '22K' },
      };

            return res.json({
        isDynamic: true,
        type: dynamicProduct.type,
        bundleDiscountPct: dynamicProduct.bundleDiscountPct,
        components,
        sizingOptions,
        puritiesByComponent,
        dynamicProduct: {
          maxRings: dynamicProduct.maxRings,
          maxChainsPerRing: dynamicProduct.maxChainsPerRing,
          maxMedallions: dynamicProduct.maxMedallions,
          chainLengthByFinger: dynamicProduct.chainLengthByFinger,
        },
        defaultConfiguration,
      });
    } catch (error) {
      console.error('Error fetching dynamic config:', error);
      return res.status(500).json({
        message: 'Server error',
        error: error.message,
      });
    }
  }

  // ============== DYNAMIC PRODUCT: PRICE PREVIEW ==============
  //
  // Accepts { configuration, skippedComponents } and returns the
  // current computed price. Public — called as the customer changes
  // sizes on the product page.
  async previewDynamicPrice(req, res) {
    try {
      const dynamicPricing = require('../services/dynamicPricing.service');

      const { configuration = {}, skippedComponents = [] } = req.body || {};

      const result = await dynamicPricing.calculatePrice(
        req.params.id,
        configuration,
        { skippedComponents }
      );

      if (!result) {
        return res.status(404).json({ message: 'Not a dynamic product or product not found' });
      }

      return res.json(result);
    } catch (error) {
      console.error('Error previewing dynamic price:', error);
      // Engine throws clear errors for missing rates — surface them.
      if (error.message && error.message.startsWith('Live metal rate not found')) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

module.exports = new ProductController();