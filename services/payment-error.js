// Keep only the failure explanation, never payment credentials or the request object.
export function paymentFailure(error, awaiting = false) {
  const raw = String(error?.errMsg || error?.message || '微信未返回具体原因')
    .replace(/\b(paySign|prepay_id|nonceStr|signature|access_token)\s*[:=]\s*[^\s,;]+/gi, '$1=[已隐藏]')
    .replace(/\s+/g, ' ').trim().slice(0, 300)
  const code = error?.errno ?? error?.errCode
  const codeText = /^-?\d{1,10}$/.test(String(code ?? '')) ? `（错误码 ${code}）` : ''
  let message = '微信支付未能完成，请查看具体原因'
  if (/no permission|access denied|banned|权限|违规/i.test(raw))
    message = '微信支付权限受限，请联系商家处理'
  else if (/签名|signature|sign error/i.test(raw))
    message = '微信支付参数校验失败，请联系商家处理'
  else if (/账号.*不一致|openid/i.test(raw))
    message = '下单账号与支付账号不一致，请重新登录'
  else if (/cancel/i.test(raw))
    message = '支付已取消，订单状态仍需核实'
  const result = new Error(message)
  result.paymentDetail = `${raw}${codeText}${awaiting ? '\n订单状态暂未确认，请先查询支付状态，勿重复付款。' : ''}`
  return result
}
