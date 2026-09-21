import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage'; 
import RegisterPage from './pages/RegisterPage'; 
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import PaymentPage from './pages/PaymentPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import AdminPanel from './pages/AdminPanel';
import AdminLogin from './pages/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import WishlistPage from './pages/WishlistPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Layout that conditionally shows Navbar and Footer
const AppLayout = ({ children }) => {
  const location = useLocation();

  // Auth pages + admin pages render full-screen without storefront chrome
  const BARE_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isBareRoute = BARE_ROUTES.some((path) => location.pathname.startsWith(path));
  const isAdminRoute = location.pathname.startsWith('/admin');
  const hideChrome = isAdminRoute || isBareRoute;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-bg transition-colors duration-300">
      {!hideChrome && <Navbar />}
      <main className="flex-grow">
        {children}
      </main>
      {!hideChrome && <Footer />}
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Router>
                <AppLayout>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />  {/* ← ADD THIS */}
                    <Route path="/register" element={<RegisterPage />} />  {/* ← ADD THIS */}
                    <Route path="/products" element={<ProductListingPage />} />
                    <Route path="/products/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/wishlist" element={<WishlistPage />}   />
                    
                    {/* Protected Routes */}
                    <Route path="/payment" element={
                      <ProtectedRoute>
                        <PaymentPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <CustomerProfilePage />
                      </ProtectedRoute>
                    } />
                    
                    {/* Admin Routes */}
                    <Route path="/admin/*" element={
                      <ProtectedRoute adminOnly>
                        <AdminPanel />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/login" element={<AdminLogin />} />
                  </Routes>
                </AppLayout>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '16px',
                    },
                    success: {
                      style: {
                        background: '#10B981',
                      },
                    },
                    error: {
                      style: {
                        background: '#EF4444',
                      },
                    },
                  }}
                />
              </Router>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;