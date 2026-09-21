// Generate order number
exports.generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// Format currency
exports.formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Calculate discount
exports.calculateDiscount = (price, discountPercentage) => {
  if (discountPercentage <= 0 || discountPercentage > 100) {
    return price;
  }
  return price * (1 - discountPercentage / 100);
};

// Validate email
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone
exports.isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

// Paginate results
exports.paginate = (data, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = page * limit;
  const paginatedData = data.slice(start, end);
  
  return {
    data: paginatedData,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: data.length,
      pages: Math.ceil(data.length / limit)
    }
  };
};

// Sanitize string
exports.sanitizeString = (str) => {
  if (!str) return '';
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};