export class ApiHelper {
  static baseUrl = 'http://10.0.0.221:8080/api'
  // 通用请求方法
  static request(url, method = 'GET', data = {}, headers = {}) {
    return new Promise((resolve, reject) => {
      const token = this.getToken()
      const authHeaders = token ? { token } : {}
      uni.request({
        url: this.baseUrl + url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers
        },
        success: (res) => {
          console.log(`API ${url} 响应:`, res.statusCode, res.data)
          resolve(res.data)
        },
        fail: (err) => {
          console.error(`API ${url} 请求失败:`, err)
          reject(err)
        }
      })
    })
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
