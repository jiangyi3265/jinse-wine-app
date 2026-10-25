import regions from '../data/china-regions.json'

export { regions }
const aliases = { '广西壮族自治区': '广西', '内蒙古自治区': '内蒙古', '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆', '西藏自治区': '西藏', '香港特别行政区': '香港', '澳门特别行政区': '澳门' }
const compact = value => String(value || '').replace(/[\s/,，、]+/g, '')
const short = value => aliases[value] || String(value || '').replace(/[省市]$/, '')
const same = (left, right) => compact(left) === compact(right) || compact(left) === short(right)
const paths = regions.flatMap(p => p.children.flatMap(c => c.children.map(d => [p.name, c.name, d.name])))

// Never guess a district. Only unique historical matches are selected.
export function resolveRegion(value = {}) {
  if (Array.isArray(value)) value = { province: value[0], city: value[1], district: value[2] }
  const { province = '', city = '', district = '', region = '' } = value
  if (city || district) {
    const hits = paths.filter(p => (!province || same(province, p[0])) && (!city || same(city, p[1])) && (!district || same(district, p[2])))
    const length = district ? 3 : 2
    const unique = [...new Map(hits.map(p => [p.slice(0, length).join('/'), p.slice(0, length)])).values()]
    if (unique.length === 1) return unique[0]
  }
  const raw = compact(region || province)
  if (!raw) return []
  const hits = paths.filter(p => {
    const variants = p.map(n => [...new Set([n, short(n)])])
    return variants[0].some(a => variants[1].some(b => variants[2].some(c => raw === a + b + c || (p[0] === p[1] && raw === a + c))))
  })
  return hits.length === 1 ? hits[0] : []
}

export function regionFields(path = []) {
  return { province: path[0] || '', city: path[1] || '', district: path[2] || '' }
}

export function isCompleteRegion(path) {
  return Array.isArray(path) && path.length === 3 && regions.some(p => p.name === path[0] && p.children.some(c => c.name === path[1] && c.children.some(d => d.name === path[2])))
}
