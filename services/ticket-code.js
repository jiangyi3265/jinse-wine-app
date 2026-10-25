// WeChat image components need a local file for base64 image responses.
export function validateTicketImage(value) {
  if (typeof value !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
      || value.length > 3 * 1024 * 1024) throw new Error('门票二维码数据无效，请重新加载')
  return value
}

export async function ticketImageSource(value) {
  validateTicketImage(value)
  // #ifdef MP-WEIXIN
  const filesystem = uni.getFileSystemManager()
  const extension = value.startsWith('data:image/png;') ? 'png' : 'jpg'
  const path = `${wx.env.USER_DATA_PATH}/jinse-ticket-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`
  await new Promise((resolve, reject) => filesystem.writeFile({
    filePath: path, data: value.slice(value.indexOf(',') + 1), encoding: 'base64',
    success: resolve, fail: () => reject(new Error('门票二维码读取失败，请重试')),
  }))
  return path
  // #endif
  // #ifndef MP-WEIXIN
  return value
  // #endif
}

export function removeTicketImage(path) {
  // #ifdef MP-WEIXIN
  if (path && path.startsWith(`${wx.env.USER_DATA_PATH}/jinse-ticket-`))
    uni.getFileSystemManager().unlink({ filePath: path, fail: () => {} })
  // #endif
}
