const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, user } = await authService.register(req.body);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, refreshToken, user } = await authService.login(req.body);

    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error.statusCode === 401) {
      return res.status(401).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { token } = await authService.refreshToken(req.body.refreshToken);
    res.json({ token });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};