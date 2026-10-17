import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy page — the "Dynamic Products" view is now merged into the
 * unified "/admin/products" grid with the ?filter=dynamic query param.
 *
 * This component exists purely as a safety net for any old bookmarks
 * or internal links that still point at /admin/dynamic-products.
 */
const DynamicProductsPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/admin/products?filter=dynamic', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-500">
      Redirecting to Products…
    </div>
  );
};

export default DynamicProductsPage;