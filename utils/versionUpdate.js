import { get } from './request.js'

/**
 * 获取当前应用版本信息
 */
function getCurrentVersion() {
  // #ifdef APP-PLUS
  return plus.runtime.versionCode
  // #endif
  // #ifndef APP-PLUS
  return 106 // 默认版本号，与manifest.json保持一致
  // #endif
}

/**
 * 获取当前版本名称
 */
function getCurrentVersionName() {
  // #ifdef APP-PLUS
  return plus.runtime.version
  // #endif
  // #ifndef APP-PLUS
  return '1.0.6'
  // #endif
}

/**
 * 检查版本更新
 * @returns {Promise<Object>} 更新信息
 */
function checkUpdate() {
  return new Promise((resolve, reject) => {
    const currentVersionCode = getCurrentVersion()
    
    get('/app/version/check', {
      platform: 'android',
      versionCode: currentVersionCode
    }, { skipAuth: true })
      .then(res => {
        if (res.code === 200 && res.data) {
          resolve(res.data)
        } else {
          resolve({ hasUpdate: false })
        }
      })
      .catch(err => {
        console.error('检查更新失败:', err)
        resolve({ hasUpdate: false })
      })
  })
}

/**
 * 下载APK文件
 * @param {String} url 下载地址
 * @param {Function} onProgress 进度回调
 * @returns {Promise<String>} 下载文件路径
 */
function downloadApk(url, onProgress) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    const downloadTask = plus.downloader.createDownload(
      url,
      {
        filename: '_doc/update.apk',
        timeout: 300
      },
      (download, status) => {
        if (status === 200) {
          resolve(download.filename)
        } else {
          reject(new Error(`下载失败，状态码: ${status}`))
        }
      }
    )
    
    downloadTask.start()
    
    if (onProgress) {
      downloadTask.addEventListener('statechanged', (download, status) => {
        if (download.state === 3) { // 下载中
          const progress = Math.round((download.downloadedSize / download.totalSize) * 100)
          onProgress(progress)
        }
      })
    }
    // #endif
    
    // #ifndef APP-PLUS
    reject(new Error('仅在APP环境下支持下载'))
    // #endif
  })
}

/**
 * 安装APK
 * @param {String} filePath APK文件路径
 */
function installApk(filePath) {
  // #ifdef APP-PLUS
  plus.runtime.install(
    filePath,
    {},
    () => {
      console.log('安装成功')
      plus.runtime.restart()
    },
    (error) => {
      console.error('安装失败:', error)
      uni.showToast({
        title: '安装失败，请手动安装',
        icon: 'none'
      })
    }
  )
  // #endif
}

/**
 * 显示更新提示弹窗
 * @param {Object} updateInfo 更新信息
 * @param {Function} onConfirm 确认回调
 * @param {Function} onCancel 取消回调
 */
function showUpdateDialog(updateInfo, onConfirm, onCancel) {
  const { versionName, updateLog, updateType } = updateInfo
  
  uni.showModal({
    title: '发现新版本',
    content: `最新版本: ${versionName}\n\n更新内容:\n${updateLog}`,
    showCancel: updateType !== 'force',
    confirmText: '立即更新',
    cancelText: updateType === 'force' ? '' : '稍后',
    success: (res) => {
      if (res.confirm) {
        onConfirm && onConfirm()
      } else {
        onCancel && onCancel()
      }
    }
  })
}

/**
 * 显示下载进度
 * @param {Number} progress 进度百分比
 */
function showDownloadProgress(progress) {
  uni.showLoading({
    title: `下载中 ${progress}%`,
    mask: true
  })
}

/**
 * 执行更新流程
 * @param {Object} updateInfo 更新信息
 */
async function performUpdate(updateInfo) {
  try {
    const { downloadUrl } = updateInfo
    
    // 下载APK
    const filePath = await downloadApk(downloadUrl, (progress) => {
      showDownloadProgress(progress)
    })
    
    uni.hideLoading()
    
    // 安装APK
    installApk(filePath)
  } catch (error) {
    uni.hideLoading()
    console.error('更新失败:', error)
    uni.showToast({
      title: '更新失败，请重试',
      icon: 'none'
    })
  }
}

/**
 * 检查并处理更新
 * @param {Boolean} silent 是否静默检查
 */
export async function checkAndHandleUpdate(silent = false) {
  try {
    const updateInfo = await checkUpdate()
    
    if (!updateInfo.hasUpdate) {
      if (!silent) {
        console.log('当前已是最新版本')
      }
      return
    }
    
    const { updateType } = updateInfo
    
    // 强制更新或建议更新
    showUpdateDialog(
      updateInfo,
      () => {
        // 用户确认更新
        performUpdate(updateInfo)
      },
      () => {
        // 用户取消更新
        if (updateType === 'force') {
          // 强制更新不允许取消，重新显示弹窗
          setTimeout(() => {
            checkAndHandleUpdate(silent)
          }, 500)
        } else {
          console.log('用户取消更新')
        }
      }
    )
  } catch (error) {
    console.error('检查更新异常:', error)
  }
}

export {
  getCurrentVersion,
  getCurrentVersionName,
  checkUpdate,
  downloadApk,
  installApk,
  performUpdate
}
