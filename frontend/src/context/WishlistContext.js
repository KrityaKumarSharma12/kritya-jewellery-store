import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const WishlistContext = createContext();

const API = 'http://localhost:5000/api';

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  // ⭐ Normalized shape: [{ id, productId, product }]
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingIds, setPendingIds] = useState(new Set());
  const { user, token } = useAuth();

  // ---------- Normalize whatever the API returns into one shape ----------
  const normalize = useCallback((raw) => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => {
        // Shape A (our API): { id, userId, productId, product }
        if (entry && typeof entry === 'object' && entry.product) {
          return {
            id: entry.id,
            productId: entry.productId || entry.product.id,
            product: entry.product,
          };
        }
        // Shape C fallback: entry is a product
        if (entry && typeof entry === 'object' && entry.id && entry.name) {
          return { id: entry.id, productId: entry.id, product: entry };
        }
        // Shape B fallback: bare join row, no product
        if (entry && typeof entry === 'object' && entry.productId) {
          return { id: entry.id, productId: entry.productId, product: null };
        }
        // Guest: entry is a bare productId string
        if (typeof entry === 'string') {
          return { id: entry, productId: entry, product: null };
        }
        return null;
      })
      .filter(Boolean);
  }, []);

  // ---------- Fetch from backend ----------
  const fetchWishlist = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/users/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlist(normalize(res.data));
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      // Don't toast on silent fetches
    } finally {
      setLoading(false);
    }
  }, [token, normalize]);

  // ---------- On auth change: load guest or user wishlist ----------
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        const guest = JSON.parse(localStorage.getItem('guestWishlist') || '[]');
        if (!cancelled) setWishlist(normalize(guest));
        return;
      }

      // ⭐ Merge guest wishlist into the account on login
      const guest = JSON.parse(localStorage.getItem('guestWishlist') || '[]');
      if (guest.length > 0 && token) {
        try {
          await Promise.all(
            guest.map((productId) =>
              axios
                .post(
                  `${API}/users/wishlist`,
                  { productId },
                  { headers: { Authorization: `Bearer ${token}` } }
                )
                .catch(() => null) // ignore duplicates / errors
            )
          );
          localStorage.removeItem('guestWishlist');
        } catch (err) {
          console.error('Failed to merge guest wishlist:', err);
        }
      }

      if (!cancelled) await fetchWishlist();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user, token, fetchWishlist, normalize]);

  // ---------- Helpers ----------
  const isWishlisted = useCallback(
    (productId) => wishlist.some((item) => item.productId === productId),
    [wishlist]
  );

  const getWishlistCount = useCallback(() => wishlist.length, [wishlist]);

  // ---------- Toggle ----------
  const toggleWishlist = useCallback(
    async (productId) => {
      if (!productId) return;

      // Guest path
      if (!user) {
        const guest = JSON.parse(localStorage.getItem('guestWishlist') || '[]');
        const idx = guest.indexOf(productId);
        if (idx > -1) guest.splice(idx, 1);
        else guest.push(productId);
        localStorage.setItem('guestWishlist', JSON.stringify(guest));
        setWishlist(normalize(guest));
        return;
      }

      // Mark pending so the heart can show a spinner
      setPendingIds((prev) => new Set(prev).add(productId));

      const currentlyIn = wishlist.some((item) => item.productId === productId);
      const url = `${API}/users/wishlist/${productId}`;
      const headers = { Authorization: `Bearer ${token}` };

      try {
        if (currentlyIn) {
          await axios.delete(url, { headers });
          setWishlist((prev) => prev.filter((item) => item.productId !== productId));
        } else {
          await axios.post(
            `${API}/users/wishlist`,
            { productId },
            { headers }
          );
          // Re-fetch to get the populated product object
          await fetchWishlist();
        }
      } catch (err) {
        console.error('Error toggling wishlist:', err);
        toast.error('Could not update wishlist');
        // Roll back by re-fetching the source of truth
        await fetchWishlist();
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [user, token, wishlist, fetchWishlist, normalize]
  );

  // ---------- Remove a single item (used by the page) ----------
  const removeFromWishlist = useCallback(
    async (productId) => {
      if (!user) {
        const guest = JSON.parse(localStorage.getItem('guestWishlist') || '[]');
        const next = guest.filter((id) => id !== productId);
        localStorage.setItem('guestWishlist', JSON.stringify(next));
        setWishlist(normalize(next));
        return;
      }

      setPendingIds((prev) => new Set(prev).add(productId));
      try {
        await axios.delete(`${API}/users/wishlist/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWishlist((prev) => prev.filter((item) => item.productId !== productId));
      } catch (err) {
        console.error('Error removing from wishlist:', err);
        toast.error('Could not remove from wishlist');
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [user, token, normalize]
  );

  // ---------- Clear all ----------
  const clearWishlist = useCallback(async () => {
    if (!user) {
      localStorage.removeItem('guestWishlist');
      setWishlist([]);
      return;
    }

    try {
      await Promise.all(
        wishlist.map((item) =>
          axios
            .delete(`${API}/users/wishlist/${item.productId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => null)
        )
      );
      setWishlist([]);
    } catch (err) {
      console.error('Error clearing wishlist:', err);
      toast.error('Could not clear wishlist');
    }
  }, [user, token, wishlist]);

  const value = {
    wishlist,
    loading,
    pendingIds,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
    isWishlisted,
    getWishlistCount,
    fetchWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};