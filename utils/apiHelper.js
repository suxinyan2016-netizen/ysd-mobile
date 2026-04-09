export class ApiHelper {
  // Compute baseUrl dynamically:
  // - If VITE_API_BASE (or VUE_APP_API_BASE) is provided use it
  // - For local dev (localhost) use relative `/api` so Vite dev-server proxy applies (avoids CORS)
  // - Otherwise fall back to the hard-coded backend host
  static get baseUrl() {
    try {
        // vite env var support - read import.meta safely inside try/catch
        const _meta = import.meta
        const base = _meta && _meta.env && (_meta.env.VITE_API_BASE || _meta.env.VUE_APP_API_BASE)
        if (base) return base
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        const h = window.location.hostname
        if (h === 'localhost' || h === '127.0.0.1') return '/api'
      }
    } catch (e) {}
    return 'http://10.0.0.221:8080/api'
  }
  // 通用请求方法
  static request(url, method = 'GET', data = {}, headers = {}) {
    return new Promise((resolve, reject) => {
      const token = this.getToken()
      const authHeaders = token ? { token } : {}

      const doRequest = () => {
        uni.request({
          url: this.baseUrl + url,
          method,
          data,
          header: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers
          },
          success: async (res) => {
            console.log(`API ${url} 响应:`, res.statusCode, res.data)
            const body = res.data

            // Detect token invalid/expired responses across common patterns
            const msg = (body && (body.message || body.msg || '')) || ''
            const lowerMsg = String(msg).toLowerCase()
            const isTokenError = (
              // HTTP level 401
              res.statusCode === 401 ||
              // backend numeric codes
              (body && (body.code === 401 || body.code === 403)) ||
              // some backends return 400 with token-specific messages
              (body && body.code === 400 && /token invalid|expire|expired|invalid token/i.test(msg)) ||
              // generic message inspection
              /token invalid|expire|expired|invalid token/i.test(lowerMsg)
            )

            if (isTokenError) {
              // Try to refresh token once (single-flight)
              const refreshed = await this._refreshTokenSingleFlight()
              if (refreshed) {
                // retry original request once with new token
                const newToken = this.getToken()
                const retryHeaders = Object.assign({}, headers, newToken ? { token: newToken } : {})
                // perform retry
                uni.request({
                  url: this.baseUrl + url,
                  method,
                  data,
                  header: {
                    'Content-Type': 'application/json',
                    ...retryHeaders
                  },
                  success: (retryRes) => {
                    console.log(`API retry ${url} 响应:`, retryRes.statusCode, retryRes.data)
                    resolve(retryRes.data)
                  },
                  fail: (err2) => {
                    console.error(`API retry ${url} 失败:`, err2)
                    reject(err2)
                  }
                })
                return
              }

              // refresh failed -> handle auth failure UX
              this._handleAuthFailure()
              reject({ code: 401, message: 'token invalid or expired' })
              return
            }

            resolve(body)
          },
          fail: (err) => {
            console.error(`API ${url} 请求失败:`, err)
            reject(err)
          }
        })
      }

      doRequest()
    })
  }

  // Single-flight refresh helper
  static _refreshTokenSingleFlight() {
    if (!this._refreshPromise) {
      this._refreshPromise = (async () => {
        try {
          const storedRefresh = uni.getStorageSync('refreshToken')
          if (!storedRefresh) return false
          // call backend refresh endpoint (uses stores/user.js path '/refresh-token')
          return await new Promise((resolve) => {
            uni.request({
              url: this.baseUrl + '/refresh-token',
              method: 'POST',
              data: { refreshToken: storedRefresh },
              header: { 'Content-Type': 'application/json' },
              success: (res) => {
                try {
                  const b = res.data
                  if (b && b.code === 1 && b.data && b.data.token) {
                    uni.setStorageSync('token', b.data.token)
                    if (b.data.expiresIn) uni.setStorageSync('tokenExpiry', (Date.now() + b.data.expiresIn * 1000).toString())
                    if (b.data.refreshToken) {
                      uni.setStorageSync('refreshToken', b.data.refreshToken)
                      if (b.data.refreshExpiresIn) uni.setStorageSync('refreshTokenExpiry', (Date.now() + b.data.refreshExpiresIn * 1000).toString())
                    }
                    resolve(true)
                    return
                  }
                } catch (e) { console.warn('refresh parse error', e) }
                resolve(false)
              },
              fail: () => resolve(false)
            })
          })
        } finally {
          // clear promise so subsequent refresh attempts can re-create it
          this._refreshPromise = null
        }
      })()
    }
    return this._refreshPromise
  }

  // UX for auth failure: clear storage and prompt user to login
  static _handleAuthFailure() {
    // prevent multiple prompts
    if (this._authModalShown) return
    this._authModalShown = true
    try {
      uni.removeStorageSync('token')
      uni.removeStorageSync('loginUser')
      uni.removeStorageSync('tokenExpiry')
      // remove refresh token as well to force fresh login
      uni.removeStorageSync('refreshToken')
      uni.removeStorageSync('refreshTokenExpiry')
    } catch (e) {}

    // show modal asking user to re-login, then redirect to login page
    try {
      uni.showModal({
        title: '需要重新登录',
        content: '会话已过期或无效，请重新登录以继续操作。',
        showCancel: false,
        success() {
          try { uni.reLaunch({ url: '/pages/login/index' }) } catch (e) { console.warn('reLaunch login failed', e) }
        }
      })
    } catch (e) {
      try { uni.reLaunch({ url: '/pages/login/index' }) } catch (err) {}
    }
  }
  static get(url, data = {}, headers = {}) {
    return this.request(url, 'GET', data, headers)
  }
  static post(url, data = {}, headers = {}) {
    return this.request(url, 'POST', data, headers)
  }
  static put(url, data = {}, headers = {}) {
    return this.request(url, 'PUT', data, headers)
  }
  static delete(url, data = {}, headers = {}) {
    return this.request(url, 'DELETE', data, headers)
  }
  // 返回 base host（用于拼接图片绝对路径）
  static getHost() {
    try {
      if (!this.baseUrl) return ''
      // remove trailing /api if exists
      return this.baseUrl.replace(/\/api\/?$/, '')
    } catch (e) {
      return this.baseUrl || ''
    }
  }
  // 获取 token
  static getToken() {
    return uni.getStorageSync('token')
  }
  // 获取带认证的 headers
  static getAuthHeaders(additionalHeaders = {}) {
    const token = this.getToken()
    return token ? { token, ...additionalHeaders } : additionalHeaders
  }

  /**
   * 检查图片数量限制
   * @param {string} moduleType - 模块类型（如 'PARCEL' 或 'ITEM'）
   * @param {string|number} recordId - 记录ID（包裹ID或商品ID）
   * @param {string} imageType - 图片类型（如 'PACKAGE_RECEIVER', 'PACKING_LIST', 'ITEM_IMAGE'）
   * @returns {Promise<void>} 超出限制时抛出错误，否则 resolve
   */
  static async checkImageLimit(moduleType, recordId, imageType) {
    const res = await this.get('/image/manage/check-limit', {
      moduleType,
      recordId,
      imageType
    })
    if (res.code !== 1) {
      throw new Error(res.msg || '图片数量校验失败')
    }
    if (res.data && res.data.limitReached) {
      throw new Error(res.data.message || '已达到图片数量限制')
    }
    // 校验通过
    return
  }

  /**
   * 删除图片
   * @param {string|number} id - 图片ID
   * @param {boolean} physical - 是否物理删除，默认为 false（逻辑删除）
   */
  static async deleteImage(id, physical = false) {
    if (!id) throw new Error('缺少图片ID')
    const url = physical ? `/image/manage/physical/${id}` : `/image/manage/${id}`
    // 尝试从本地存储获取用户名，作为后端要求的 header
    let username = null
    try {
      const saved = uni.getStorageSync('loginUser')
      if (saved) {
        const u = JSON.parse(saved)
        username = u?.name || u?.username || null
      }
    } catch (e) {
      // 忽略解析错误
    }
    const headers = username ? { username } : {}
    const res = await this.delete(url, {}, headers)
    if (!res) throw new Error('删除图片请求失败')
    if (res.code !== 1) {
      throw new Error(res.msg || '删除图片失败')
    }
    return res
  }
}
