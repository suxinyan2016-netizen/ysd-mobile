// tokenManager.js (uni-app适配)
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;
const STORAGE_KEYS = {
  LOGIN_USER: 'loginUser',
  TOKEN_EXPIRY: 'tokenExpiry',
  REFRESH_TOKEN: 'refreshToken',
  REFRESH_TOKEN_EXPIRY: 'refreshTokenExpiry'
};

export const getTokenInfo = () => {
  const loginUser = JSON.parse(uni.getStorageSync(STORAGE_KEYS.LOGIN_USER) || '{}');
  const tokenExpiry = uni.getStorageSync(STORAGE_KEYS.TOKEN_EXPIRY);
  const refreshToken = uni.getStorageSync(STORAGE_KEYS.REFRESH_TOKEN);
  const refreshTokenExpiry = uni.getStorageSync(STORAGE_KEYS.REFRESH_TOKEN_EXPIRY);
  return {
    token: loginUser.token || null,
    tokenExpiry: tokenExpiry ? parseInt(tokenExpiry) : null,
    refreshToken: refreshToken,
    refreshTokenExpiry: refreshTokenExpiry ? parseInt(refreshTokenExpiry) : null,
    loginUser: loginUser
  };
};

export const saveTokenInfo = (token, expiresIn, refreshToken = null, refreshExpiresIn = null) => {
  const now = Date.now();
  const tokenExpiry = now + (expiresIn * 1000);
  const loginUser = JSON.parse(uni.getStorageSync(STORAGE_KEYS.LOGIN_USER) || '{}');
  loginUser.token = token;
  uni.setStorageSync(STORAGE_KEYS.LOGIN_USER, JSON.stringify(loginUser));
  uni.setStorageSync(STORAGE_KEYS.TOKEN_EXPIRY, tokenExpiry.toString());
  if (refreshToken) {
    uni.setStorageSync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    const refreshTokenExpiry = now + (refreshExpiresIn * 1000);
    uni.setStorageSync(STORAGE_KEYS.REFRESH_TOKEN_EXPIRY, refreshTokenExpiry.toString());
  }
};

export const isTokenExpired = () => {
  const { token, tokenExpiry } = getTokenInfo();
  if (!token) return true;
  if (!tokenExpiry) return false;
  const now = Date.now();
  return now >= tokenExpiry;
};

export const isTokenExpiringSoon = () => {
  const { tokenExpiry } = getTokenInfo();
  if (!tokenExpiry) return false;
  const now = Date.now();
  const expiresIn = tokenExpiry - now;
  return expiresIn < TOKEN_EXPIRY_BUFFER && expiresIn > 0;
};

export const isRefreshTokenExpired = () => {
  const { refreshToken, refreshTokenExpiry } = getTokenInfo();
  if (!refreshToken) return true;
  if (!refreshTokenExpiry) return false;
  const now = Date.now();
  return now >= refreshTokenExpiry;
};

export const clearTokenInfo = () => {
  uni.removeStorageSync(STORAGE_KEYS.LOGIN_USER);
  uni.removeStorageSync(STORAGE_KEYS.TOKEN_EXPIRY);
  uni.removeStorageSync(STORAGE_KEYS.REFRESH_TOKEN);
  uni.removeStorageSync(STORAGE_KEYS.REFRESH_TOKEN_EXPIRY);
};

export const getTokenRemainingTime = () => {
  const { tokenExpiry } = getTokenInfo();
  if (!tokenExpiry) return 0;
  const now = Date.now();
  return Math.max(0, tokenExpiry - now);
};

export const getTokenStatus = () => {
  const { token, tokenExpiry } = getTokenInfo();
  const now = Date.now();
  if (!token) {
    return { status: 'NO_TOKEN', message: 'No token available' };
  }
  if (!tokenExpiry) {
    return { status: 'VALID', message: 'Token valid (no expiry)', remainingMs: Infinity };
  }
  if (now >= tokenExpiry) {
    return { status: 'EXPIRED', message: 'Token has expired', remainingMs: 0 };
  }
  const remainingMs = tokenExpiry - now;
  const remainingSec = Math.round(remainingMs / 1000);
  if (remainingMs < TOKEN_EXPIRY_BUFFER) {
    return { status: 'EXPIRING_SOON', message: `Token expires in ${remainingSec}s`, remainingMs };
  }
  return { status: 'VALID', message: `Token valid for ${remainingSec}s`, remainingMs };
};
