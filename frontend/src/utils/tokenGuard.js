// ===== PATCH localStorage.getItem / removeItem for 'token' =====
// This runs on module import before React mounts.
// By patching Storage.prototype, ANY call to localStorage.getItem('token')
// is intercepted - including DevTools, React, and all JavaScript code.
// If the token was deleted but the httpOnly refresh cookie exists,
// getItem will still return the cached value (never null).
(function () {
  if (window.__tokenGuardInstalled) return;
  window.__tokenGuardInstalled = true;

  const ORIGINAL_GET = Storage.prototype.getItem;
  const ORIGINAL_SET = Storage.prototype.setItem;
  const ORIGINAL_REMOVE = Storage.prototype.removeItem;

  let refreshAttempted = false;
  let cachedToken = localStorage.getItem('token');

  // ===== PATCH getItem =====
  // If token was deleted but we have a cached copy, return the cache.
  // This prevents ANY code (React, route guards, DevTools reads) from seeing null.
  Storage.prototype.getItem = function (key) {
    if (key === 'token') {
      // If it exists in localStorage, update cache and return it
      const live = ORIGINAL_GET.call(this, 'token');
      if (live) {
        cachedToken = live;
        return live;
      }
      // Token was deleted! Return cached value if available and cookie exists
      if (cachedToken && document.cookie.includes('refreshToken=')) {
        // Restore it to localStorage so other code that reads directly also sees it
        ORIGINAL_SET.call(this, 'token', cachedToken);
        return cachedToken;
      }
      // No cache and no cookie → really null
      cachedToken = null;
      return null;
    }
    return ORIGINAL_GET.call(this, key);
  };

  // ===== PATCH setItem =====
  Storage.prototype.setItem = function (key, value) {
    if (key === 'token') {
      cachedToken = value;
    }
    ORIGINAL_SET.call(this, key, value);
  };

  // ===== PATCH removeItem =====
  // When token is removed, immediately try to refresh from cookie
  Storage.prototype.removeItem = function (key) {
    if (key !== 'token') {
      ORIGINAL_REMOVE.call(this, key);
      return;
    }

    // Check if refresh cookie exists
    const hasCookie = document.cookie.includes('refreshToken=');
    if (!hasCookie) {
      // No cookie → actually delete
      cachedToken = null;
      ORIGINAL_REMOVE.call(this, 'token');
      return;
    }

    // Cookie exists → don't actually remove from localStorage.
    // The ORIGINAL_REMOVE already happened, but getItem will restore it
    // from cache on next read. Now try to refresh in background.
    if (!refreshAttempted) {
      refreshAttempted = true;
      fetch('/api/auth/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((r) => r.json())
        .then((data) => {
          const newToken = data?.data?.accessToken || data?.accessToken;
          if (newToken) {
            cachedToken = newToken;
            ORIGINAL_SET.call(localStorage, 'token', newToken);
          } else {
            // Refresh returned no token - something is wrong
            cachedToken = null;
            ORIGINAL_REMOVE.call(localStorage, 'token');
          }
        })
        .catch(() => {
          // Refresh failed - let the user continue with cached token
          // Next API call will fail with 401 and api.js interceptor handles it
        })
        .finally(() => {
          refreshAttempted = false;
        });
    }
  };
})();