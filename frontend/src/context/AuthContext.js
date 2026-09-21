import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// ✅ FIX: Single source of truth for "who counts as an admin"
// Keep this in sync with your backend (middleware/auth.js) and Prisma AdminRole enum.
export const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'PRODUCT_MANAGER',
  'ORDER_MANAGER',
  'CUSTOMER_SUPPORT',
  'ACCOUNTANT',
];

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, [token]);

  const register = async (userData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', userData);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  // ⭐ Update the user object and keep localStorage in sync.
  const updateUser = (updatesOrFn) => {
    setUser((prev) => {
      const next =
        typeof updatesOrFn === 'function'
          ? updatesOrFn(prev)
          : { ...(prev || {}), ...updatesOrFn };

      if (next) {
        localStorage.setItem('user', JSON.stringify(next));
      }
      return next;
    });
  };

  // ⭐ Refetch the user from the backend (useful after profile updates).
  const refreshUser = async () => {
    if (!token) return null;
    try {
      const response = await axios.get('http://localhost:5000/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const freshUser = response.data;
      setUser((prev) => {
        const merged = { ...(prev || {}), ...freshUser };
        localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      });
      return freshUser;
    } catch (error) {
      console.error('refreshUser failed:', error);
      return null;
    }
  };

  const value = {
    user,
    token,
    loading,
    register,
    login,
    logout,
    updateUser,
    refreshUser,
    setUser: updateUser,
    isAuthenticated: !!user,
    // ✅ FIX: was `user?.role === 'ADMIN'` — now checks the full admin-role list
    isAdmin: ADMIN_ROLES.includes(user?.role),
    // ✅ BONUS: handy helpers you'll likely want later
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    adminRole: ADMIN_ROLES.includes(user?.role) ? user.role : null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};