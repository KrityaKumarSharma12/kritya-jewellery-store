const settingsService = require('../services/settings.service');

class SettingsController {
  // Get public settings (for customer frontend)
  async getPublicSettings(req, res) {
    try {
      const settings = await settingsService.getPublicSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching public settings:', error);
      // Service already returns fallback — but double-guard in case of unexpected errors
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get all settings (admin only)
  async getSettings(req, res) {
    try {
      const settings = await settingsService.getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Update settings (admin only)
  async updateSettings(req, res) {
    try {
      const updated = await settingsService.updateSettings(req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = new SettingsController();