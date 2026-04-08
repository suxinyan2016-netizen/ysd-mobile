export function smartBack(fallback = '/pages/home/index') {
  try {
    const pages = (typeof getCurrentPages === 'function') ? getCurrentPages() : []
    if (pages && pages.length > 1) {
      try { uni.navigateBack() } catch (e) { uni.switchTab({ url: fallback }) }
    } else {
      uni.switchTab({ url: fallback })
    }
  } catch (e) {
    try { uni.navigateBack() } catch (err) { try { uni.switchTab({ url: fallback }) } catch (e2) {} }
  }
}

export default { smartBack }
