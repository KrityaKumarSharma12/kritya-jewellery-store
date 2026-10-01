import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

// ⭐ Real values from your Tawk.to dashboard
// Admin → Channels → Chat Widget → Widget Code
const TAWK_PROPERTY_ID = '6aba532021e0d53446e040a3';
const TAWK_WIDGET_ID = '1k3jt9e29';

const HIDDEN_ROUTES = ['/payment', '/admin'];

const TawkChat = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const shouldHide = HIDDEN_ROUTES.some((route) => pathname.startsWith(route));

  // 1. Load the widget script once
  useEffect(() => {
    // Guard: don't load with placeholder IDs
    if (
      TAWK_PROPERTY_ID === 'YOUR_PROPERTY_ID' ||
      TAWK_WIDGET_ID === 'YOUR_WIDGET_ID'
    ) {
      console.warn(
        '[TawkChat] Placeholder IDs detected. Replace TAWK_PROPERTY_ID and ' +
          'TAWK_WIDGET_ID in src/components/TawkChat.jsx with the real values ' +
          'from your Tawk.to dashboard (Admin → Channels → Chat Widget).'
      );
      return;
    }

    // If already loaded, skip
    if (window.Tawk_API && window.Tawk_API.embedded) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const s1 = document.createElement('script');
    const s0 = document.getElementsByTagName('script')[0];
    s1.async = true;
    s1.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);

    return () => {
      if (window.Tawk_API?.hideWidget) {
        window.Tawk_API.hideWidget();
      }
    };
  }, []);

  // 2. Show/hide the widget based on the current route
  useEffect(() => {
    if (!window.Tawk_API) return;

    const applyVisibility = () => {
      if (shouldHide) {
        window.Tawk_API.hideWidget?.();
      } else {
        window.Tawk_API.showWidget?.();
      }
    };

    if (window.Tawk_API.embedded) {
      applyVisibility();
    } else {
      const prevOnLoad = window.Tawk_API.onLoad;
      window.Tawk_API.onLoad = function () {
        if (typeof prevOnLoad === 'function') prevOnLoad();
        applyVisibility();
      };
    }
  }, [shouldHide]);

  // 3. Update visitor info when the user logs in / out
  useEffect(() => {
    if (!window.Tawk_API?.setAttributes) return;
    window.Tawk_API.setAttributes(
      {
        name: user?.name || 'Guest',
        email: user?.email || '',
      },
      function (err) {
        if (err) console.warn('Tawk setAttributes error:', err);
      }
    );
  }, [user?.name, user?.email]);

  return null;
};

export default TawkChat;