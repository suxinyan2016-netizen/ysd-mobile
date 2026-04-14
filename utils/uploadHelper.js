import { ApiHelper } from '@/utils/apiHelper'

export function chooseFileFlexible({ count = 1, allowPdf = true } = {}) {
  return new Promise((resolve) => {
    function normalizeTempFiles(tempFiles) {
      const arr = (tempFiles || []).map(f => {
        const path = f.path || f.tempFilePath || f.filePath || f.uri || f.tempFile || ''
        const name = f.name || f.filename || (path && path.split('/').pop()) || ''
        const isPdf = (name || '').toLowerCase().endsWith('.pdf') || (path || '').toLowerCase().endsWith('.pdf')
        return { path, name, isPdf }
      })
      return arr
    }

    // try message file first (miniapp / uni extensions)
    if (typeof uni.chooseMessageFile === 'function') {
      uni.chooseMessageFile({ count, type: 'file', success: (res) => {
        resolve(normalizeTempFiles(res && res.tempFiles ? res.tempFiles : []))
      }, fail: () => {
        // fallback
        if (typeof uni.chooseFile === 'function') {
          uni.chooseFile({ count, success: (r) => resolve(normalizeTempFiles(r && r.tempFiles ? r.tempFiles : (r && r.files) || [])), fail: () => resolve([]) })
        } else if (typeof uni.chooseImage === 'function') {
          uni.chooseImage({ count, sizeType: ['compressed'], sourceType: ['camera','album'], success: (r) => resolve((r.tempFilePaths||[]).map(p=>({ path:p, name:(p||'').split('/').pop(), isPdf:false }))), fail: () => resolve([]) })
        } else resolve([])
      } })
      return
    }

    // try chooseFile (some runtimes)
    if (typeof uni.chooseFile === 'function') {
      uni.chooseFile({ count, success: (res) => { resolve(normalizeTempFiles(res && res.tempFiles ? res.tempFiles : (res && res.files) || [])) }, fail: () => resolve([]) })
      return
    }

    // fallback to chooseImage (no file support)
    if (typeof uni.chooseImage === 'function') {
      uni.chooseImage({ count, sizeType: ['compressed'], sourceType: ['camera','album'], success: (r) => resolve((r.tempFilePaths||[]).map(p=>({ path:p, name:(p||'').split('/').pop(), isPdf:false }))), fail: () => resolve([]) })
      return
    }

    // very old/unsupported runtime — return empty
    resolve([])
  })
}

export function uploadFile(filePath, moduleType, recordId, imageType, tempKey) {
  return new Promise((resolve, reject) => {
    try {
        const uploadUrl = ApiHelper.baseUrl + '/image/manage/upload'
      let username = null
      try { const saved = uni.getStorageSync('loginUser'); if (saved) { const u = JSON.parse(saved); username = u?.name || u?.username || null } } catch (e) {}
      const headers = ApiHelper.getAuthHeaders(username ? { username } : {})
      const formData = { moduleType, recordId, imageType }
      // include tempKey when provided so backend can associate uploads with a transient owner
      if (tempKey) formData.tempKey = tempKey
        // Detailed debug: include headers and final formData used for upload
        console.debug('[uploadFile] uploading', { uploadUrl, filePath, formData, headers })
      uni.uploadFile({ url: uploadUrl, filePath, name: 'file', header: headers, formData, success: (uploadRes) => {
        try {
          const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
          if (data && data.code === 1) resolve(data.data)
          else reject(new Error((data && data.msg) || '上传失败'))
        } catch (err) { reject(err) }
      }, fail: (err) => reject(err) })
    } catch (err) { reject(err) }
  })
}

/**
 * 尝试将临时上传的附件（以 tempKey 关联）绑定到真实记录ID上。
 * 返回后端响应或者在不支持时抛出错误。
 * @param {string} moduleType
 * @param {string} tempKey
 * @param {number|string} recordId
 */
export async function reassignAttachments(moduleType, tempKey, recordId) {
  if (!tempKey) {
    console.warn('reassignAttachments called without tempKey — nothing to do')
    return null
  }
  try {
    // Prefer the new tempKey-based endpoint
    const payload = { moduleType, tempKey, newRecordId: recordId }
    console.debug('[reassignAttachments] calling reassign-by-tempkey', payload)
    // Spring controller expects request parameters; send as form-urlencoded
    const form = new URLSearchParams(payload).toString()
    // include username header if available (backend requires it)
    let username = null
    try { const saved = uni.getStorageSync('loginUser'); if (saved) { const u = JSON.parse(saved); username = u?.name || u?.username || null } } catch (e) {}
    const headers = ApiHelper.getAuthHeaders(username ? { username } : {})
    const res = await ApiHelper.post('/image/manage/reassign-by-tempkey', form, Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, headers))
    if (res && res.code === 1) return res
    // Fallback: try the reassign by oldRecordId endpoint (some deployments require uploadBy header)
    const fallbackPayload = { moduleType, oldRecordId: -1, newRecordId: recordId }
    console.debug('[reassignAttachments] fallback reassign', { fallbackPayload, headers })
    const form2 = new URLSearchParams(fallbackPayload).toString()
    const r2 = await ApiHelper.post('/image/manage/reassign', form2, Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, headers))
    return r2
  } catch (err) {
    console.warn('[reassignAttachments] failed or endpoint unavailable', err)
    // don't throw — reassign is best-effort
    return { skipped: true, error: String(err && err.message ? err.message : err) }
  }
}
