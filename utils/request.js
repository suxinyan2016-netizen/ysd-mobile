// ...existing code...
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
