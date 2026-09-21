const cartService = require('../services/cart.service');

// ============== GET CART ==============
exports.getCart = async (req, res) => {
  try {
    const result = await cartService.getCart(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== ADD TO CART ==============
exports.addToCart = async (req, res) => {
  try {
    const result = await cartService.addToCart(req.user.id, req.body);
    res.json({
      message: 'Added to cart successfully',
      item: result.item,
      cart: result.cart,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== UPDATE CART ITEM ==============
exports.updateCartItem = async (req, res) => {
  try {
    const result = await cartService.updateCartItem(
      req.user.id,
      req.params.productId,
      req.body.quantity
    );
    res.json({ message: 'Cart updated successfully', cart: result.cart });
  } catch (error) {
    console.error('Update cart error:', error);
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== REMOVE FROM CART ==============
exports.removeFromCart = async (req, res) => {
  try {
    const result = await cartService.removeFromCart(req.user.id, req.params.productId);
    res.json({ message: 'Removed from cart successfully', cart: result.cart });
  } catch (error) {
    console.error('Remove from cart error:', error);
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== CLEAR CART ==============
exports.clearCart = async (req, res) => {
  try {
    const result = await cartService.clearCart(req.user.id);
    res.json({ message: 'Cart cleared successfully', cart: result.cart });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== GET CART WITH TOTALS ==============
exports.getCartWithTotals = async (req, res) => {
  try {
    const result = await cartService.getCartWithTotals(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Get cart with totals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};