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
      console.log('[request.js] Native runtime detected, using: http://pacitem.com/api')
      return 'http://pacitem.com/api'
    }
  } catch (e) {}

  console.log('[request.js] Using fallback: http://10.0.0.221:8080/api')
  return 'http://10.0.0.221:8080/api'
}

const API_BASE = getApiBase()

export function request(options) {
  return new Promise(async (resolve, reject) => {
    const skipAuth = options.skipAuth === true || isInWhitelist(options.url);
    let token = '';
    if (!skipAuth) {
      const tokenInfo = getTokenInfo();
      token = tokenInfo.token;
      const tokenStatus = getTokenStatus();
      if (isTokenExpired()) {
        const refreshResult = await refreshAccessToken();
        if (refreshResult && refreshResult.token) {
          token = refreshResult.token;
        } else {
          clearTokenInfo();
          cancelScheduledRefresh();
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          uni.reLaunch({ url: '/pages/index/index' });
          return reject(new Error('Token refresh failed'));
        }
      } else if (token) {
        if (isTokenExpiringSoon()) {
          const remainingTime = getTokenInfo().tokenExpiry - Date.now();
          scheduleTokenRefresh(remainingTime);
        }
      }
    }
    let finalUrl = options.url;
    if (!isInWhitelist(options.url)) {
      finalUrl = API_BASE + options.url;
    }
    uni.request({
      ...options,
      url: finalUrl,
      header: {
        ...(options.header || {}),
        ...(token ? { token } : {})
      },
      success: (res) => {
        if (res.statusCode === 401) {
          clearTokenInfo();
          cancelScheduledRefresh();
          uni.showToast({ title: '登录已失效，请重新登录', icon: 'none' });
          uni.reLaunch({ url: '/pages/index/index' });
          reject(new Error('Unauthorized'));
        } else if (res.statusCode === 403) {
          uni.showToast({ title: '无权限访问', icon: 'none' });
          reject(new Error('Forbidden'));
        } else {
          resolve(res.data);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      }
    });
  });
}

export function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
}

export function get(url, data = {}, options = {}) {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
}
