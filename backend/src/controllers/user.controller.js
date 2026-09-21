const userService = require('../services/user.service');

exports.getProfile = async (req, res) => {
  try {
    const user = await userService.getProfile(req.user.id);
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    await userService.changePassword(req.user.id, req.body);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== GET ORDERS ==============
exports.getOrders = async (req, res) => {
  try {
    const orders = await userService.getOrders(req.user.id);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============== GET WISHLIST ==============
exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await userService.getWishlist(req.user.id);
    res.json(wishlist);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const item = await userService.addToWishlist(req.user.id, req.body.productId);
    res.status(201).json(item);
  } catch (error) {
    console.error('Add to wishlist error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    await userService.removeFromWishlist(req.user.id, req.params.productId);
    res.json({ message: 'Removed from wishlist successfully' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};