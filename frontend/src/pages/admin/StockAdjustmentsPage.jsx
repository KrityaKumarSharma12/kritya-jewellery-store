import React from 'react';
import { RefreshCw, Construction } from 'lucide-react';

const StockAdjustmentsPage = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center mb-4">
      <RefreshCw className="h-8 w-8 text-gold-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
      Stock Adjustments
    </h2>
    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-4">
      Record manual stock adjustments, damages, and returns.
    </p>
    <div className="flex items-center gap-2 text-xs text-gold-600 dark:text-gold-400">
      <Construction className="h-4 w-4" />
      <span>Under construction</span>
    </div>
  </div>
);

export default StockAdjustmentsPage;