export function availableRuleAgreements(items) {
  const list = Array.isArray(items) ? items : []
  return [
    { type: 'service', label: '《用户服务协议》' },
    { type: 'privacy', label: '《隐私保护指引》' },
  ].filter(agreement => {
    const item = list.find(value => value?.key === `rules.${agreement.type}`)
    return normalizeRuleContent(item?.content, agreement.type).sections.some(section => section.lines.length)
  })
}

// The API exposes remaining stock, not the original prize-pool quantity.
export function drawRuleTables(activities) {
  const number = value => value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null
  const reward = prize => {
    if (prize.kind === 'cash') {
      const min = number(prize.amountMinCent), max = number(prize.amountMaxCent)
      if (min === null || max === null || min < 0 || max < min) return '以活动为准'
      return min === max ? `¥${(min / 100).toFixed(2)}` : `¥${(min / 100).toFixed(2)}–¥${(max / 100).toFixed(2)}`
    }
    if (prize.kind === 'points') {
      const points = number(prize.points)
      return points !== null && points >= 0 ? `${points} 积分` : '以活动为准'
    }
    return { ticket: '门票权益', voucher: '电子券权益', coupon: '优惠权益', goods: '实物礼品' }[prize.kind] || '以活动为准'
  }
  return (Array.isArray(activities) ? activities : []).filter(activity => activity && Array.isArray(activity.prizes)).map((activity, index) => ({
    key: activity.activityId ?? index,
    title: activity.activityName || '当前活动',
    columns: ['奖品', '权益说明', '剩余份数'],
    rows: activity.prizes.filter(prize => typeof prize?.name === 'string' && prize.name.trim()).map(prize => {
      const stock = number(prize.stock)
      return [prize.name, reward(prize), stock === null ? '以活动为准' : stock < 0 ? '不限' : String(stock)]
    }),
  })).filter(table => table.rows.length)
}

export function normalizeRuleContent(raw, type) {
  let content = raw
  if (typeof content === 'string') {
    try { content = JSON.parse(content) } catch { content = null }
  }
  const rows = Array.isArray(content) ? content : content?.sections || content?.[type] || []
  const sections = (Array.isArray(rows) ? rows : []).filter(row => row && typeof row === 'object').map(row => ({
    heading: row.heading || row.title || '规则说明',
    lines: (Array.isArray(row.lines) ? row.lines : [row.text || '']).filter(line => typeof line === 'string' && line.trim()),
  }))
  const source = content?.table
  const table = Array.isArray(source?.columns) && Array.isArray(source?.rows) ? {
    columns: source.columns.map(value => String(value ?? '')),
    rows: source.rows.filter(Array.isArray).map(row => source.columns.map((_, index) => String(row[index] ?? ''))),
  } : null
  return { sections, table }
}
