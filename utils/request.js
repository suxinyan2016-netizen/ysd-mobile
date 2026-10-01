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
      console.log('[request.js] Native runtime detected, using: https://pacitem.com/api')
      return 'https://pacitem.com/api'
    }
  } catch (e) {}

  console.log('[request.js] Using fallback: http://10.0.0.221:8080/api')
  return 'http://10.0.0.221:8080/api'
}

const API_BASE = getApiBase()

export function request(options) {
  console.log('[request.js] request函数调用，options:', options)
  return new Promise(async (resolve, reject) => {
    console.log('[request.js] 开始处理请求')
    const skipAuth = options.skipAuth === true;
    console.log('[request.js] skipAuth:', skipAuth)
    let token = '';
    if (!skipAuth) {
      console.log('[request.js] 需要认证，获取token')
      const tokenInfo = getTokenInfo();
      token = tokenInfo.token;
      const tokenStatus = getTokenStatus();
      if (isTokenExpired()) {
        console.log('[request.js] Token已过期，刷新token')
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
    console.log('[request.js] 计算finalUrl')
    let finalUrl = options.url;
    // 始终拼接API_BASE，确保URL完整
    finalUrl = API_BASE + options.url;
    console.log('[request.js] 最终请求URL:', finalUrl)
    console.log('[request.js] 准备调用uni.request')
    uni.request({
      ...options,
      url: finalUrl,
      header: {
        ...(options.header || {}),
        ...(token ? { token } : {})
      },
      success: (res) => {
        console.log('[request.js] uni.request成功返回:', res)
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
        console.error('[request.js] 请求失败:', err);
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
  console.log('[request.js] get函数调用，url:', url, 'data:', data, 'options:', options)
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
}
