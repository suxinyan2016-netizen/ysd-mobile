import { get } from './request.js'

console.log('[版本更新] versionUpdate.js加载，get函数:', typeof get)

/**
 * 获取当前应用版本信息
 */
function getCurrentVersion() {
  // #ifdef APP-PLUS
  const versionCode = plus.runtime.versionCode
  console.log('[版本更新] 当前APP版本号:', versionCode)
  return versionCode
  // #endif
  // #ifndef APP-PLUS
  console.log('[版本更新] 非APP环境，使用默认版本号: 106')
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
    console.log('[版本更新] 准备请求接口，版本号:', currentVersionCode)

    // 检查API_BASE配置
    try {
      if (typeof plus !== 'undefined') {
        console.log('[版本更新] APP环境，API_BASE应为: https://pacitem.com/api')
      }
    } catch (e) {}

    console.log('[版本更新] 准备调用get函数')
    get('/app/version/check', {
      platform: 'android',
      versionCode: currentVersionCode
    }, { skipAuth: true })
      .then(res => {
        console.log('[版本更新] 接口返回:', res)
        if ((res.code === 200 || res.code === 1) && res.data) {
          resolve(res.data)
        } else {
          console.log('[版本更新] 返回无更新或code不匹配:', res)
          resolve({ hasUpdate: false })
        }
      })
      .catch(err => {
        console.error('[版本更新] 接口请求失败:', err)
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
 * @param {Function} logCallback 日志回调函数
 */
async function performUpdate(updateInfo, logCallback = null) {
  const log = (message) => {
    console.log('[版本更新]', message)
    if (logCallback) logCallback(message)
  }

  try {
    const { downloadUrl } = updateInfo
    log('开始下载APK: ' + downloadUrl)

    // 下载APK
    const filePath = await downloadApk(downloadUrl, (progress) => {
      // 只在控制台输出，不重复调用logCallback
      console.log('[版本更新] 下载进度:', progress + '%')
      showDownloadProgress(progress)
    })

    uni.hideLoading()
    log('下载完成，准备安装: ' + filePath)

    // 安装APK
    installApk(filePath)
  } catch (error) {
    uni.hideLoading()
    log('更新失败: ' + error?.message || error)
    uni.showToast({
      title: '更新失败，请重试',
      icon: 'none'
    })
  }
}

/**
 * 检查并处理更新
 * @param {Boolean} silent 是否静默检查
 * @param {Function} logCallback 日志回调函数
 */
export async function checkAndHandleUpdate(silent = false, logCallback = null) {
  const log = (message) => {
    console.log('[版本更新]', message)
    if (logCallback) logCallback(message)
  }

  log('3. checkAndHandleUpdate开始，静默模式: ' + silent)
  try {
    log('4. 调用checkUpdate')
    const updateInfo = await checkUpdate()
    log('5. checkUpdate返回: ' + JSON.stringify(updateInfo))

    if (!updateInfo.hasUpdate) {
      if (!silent) {
        log('6. 当前已是最新版本')
      } else {
        log('6. 静默检查：当前已是最新版本')
      }
      return
    }

    log('6. 发现新版本，准备显示更新弹窗')
    const { updateType } = updateInfo

    // 强制更新或建议更新
    showUpdateDialog(
      updateInfo,
      () => {
        // 用户确认更新
        log('7. 用户确认更新')
        performUpdate(updateInfo, log)
      },
      () => {
        // 用户取消更新
        log('7. 用户取消更新')
        if (updateType === 'force') {
          // 强制更新不允许取消，重新显示弹窗
          setTimeout(() => {
            checkAndHandleUpdate(silent, logCallback)
          }, 500)
        } else {
          log('用户取消更新')
        }
      }
    )
  } catch (error) {
    log('5. 检查更新异常: ' + (error?.message || error))
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
