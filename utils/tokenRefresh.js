// tokenRefresh.js (uni-app适配)
import { saveTokenInfo, clearTokenInfo, getTokenInfo } from './tokenManager.js';

const API_BASE = process.env.VUE_APP_API_BASE || '/api';
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
