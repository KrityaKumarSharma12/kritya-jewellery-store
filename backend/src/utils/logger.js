// Simple logger
const logger = {
  info: (message, meta = {}) => {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...meta
    };
    console.log(JSON.stringify(log));
  },
  
  error: (message, error = null, meta = {}) => {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error ? error.message : null,
      stack: error ? error.stack : null,
      ...meta
    };
    console.error(JSON.stringify(log));
  },
  
  warn: (message, meta = {}) => {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      ...meta
    };
    console.warn(JSON.stringify(log));
  }
};

module.exports = logger;