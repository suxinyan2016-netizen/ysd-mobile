// tokenRefresh.js (uni-app适配)
import { saveTokenInfo, clearTokenInfo, getTokenInfo } from './tokenManager.js';

// Compute API_BASE dynamically to handle different environments
function getApiBase() {
  try {
    // vite env var support - read import.meta safely inside try/catch
    const _meta = import.meta
    const base = _meta && _meta.env && (_meta.env.VITE_API_BASE || _meta.env.VUE_APP_API_BASE)
    if (base) return base
    // If this is a production build but env var wasn't provided by the builder,
    // fall back to the known production API host to avoid pointing to localhost.
    if (_meta && _meta.env && _meta.env.PROD) {
      return 'https://pacitem.com/api'
    }
  } catch (e) {}
  try {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const h = window.location.hostname
      if (h === 'localhost' || h === '127.0.0.1') return '/api'
    }
  } catch (e) {}

  // If running in native runtime (HBuilder/uni-app 'plus' runtime),
  // cloud-built APK should use production backend by default.
  try {
    if (typeof plus !== 'undefined') {
      console.log('[tokenRefresh.js] Native runtime detected, using: http://pacitem.com/api')
      return 'http://pacitem.com/api'
    }
  } catch (e) {}

  console.log('[tokenRefresh.js] Using fallback: http://10.0.0.221:8080/api')
  return 'http://10.0.0.221:8080/api'
}

const API_BASE = getApiBase()
let isRefreshing = false;
let refreshPromise = null;
let refreshTimeoutId = null;

export const refreshAccessToken = async () => {
  if (isRefreshing) return refreshPromise;
  isRefreshing = true;
  try {
    const { refreshToken } = getTokenInfo();
    if (!refreshToken) return null;
    refreshPromise = uni.request({
      url: API_BASE + '/refresh',
      method: 'POST',
      data: { refreshToken },
      timeout: 10000
    });
    const [err, res] = await refreshPromise;
    if (!err && res.data && res.data.code === 1) {
      const { token: newToken, expiresIn, refreshToken: newRefreshToken, refreshExpiresIn } = res.data.data;
      saveTokenInfo(newToken, expiresIn, newRefreshToken, refreshExpiresIn);
      return { token: newToken, expiresIn };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
};

export const scheduleTokenRefresh = (remainingMs) => {
  const { refreshToken } = getTokenInfo();
  if (!refreshToken) return;
  const refreshDelay = Math.max(0, remainingMs - 5 * 60 * 1000);
  if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
  if (refreshDelay > 0) {
    refreshTimeoutId = setTimeout(() => {
      refreshTokenInBackground();
    }, refreshDelay);
  } else {
    refreshTokenInBackground();
  }
};

export const cancelScheduledRefresh = () => {
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
};

export const refreshTokenInBackground = async () => {
  try {
    await refreshAccessToken();
  } catch (error) {}
};
