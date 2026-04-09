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

export function uploadFile(filePath, moduleType, recordId, imageType) {
  return new Promise((resolve, reject) => {
    try {
      const uploadUrl = ApiHelper.baseUrl + '/image/manage/upload'
      let username = null
      try { const saved = uni.getStorageSync('loginUser'); if (saved) { const u = JSON.parse(saved); username = u?.name || u?.username || null } } catch (e) {}
      const headers = ApiHelper.getAuthHeaders(username ? { username } : {})
      uni.uploadFile({ url: uploadUrl, filePath, name: 'file', header: headers, formData: { moduleType, recordId, imageType }, success: (uploadRes) => {
        try {
          const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
          if (data && data.code === 1) resolve(data.data)
          else reject(new Error((data && data.msg) || '上传失败'))
        } catch (err) { reject(err) }
      }, fail: (err) => reject(err) })
    } catch (err) { reject(err) }
  })
}
