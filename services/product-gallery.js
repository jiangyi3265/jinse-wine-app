import { get } from './api.js'
import { isApiMode } from './config.js'
import { productImage } from './product-media.js'

// Extra product photos use the existing, independently editable page-content API.
export async function loadProductPresentation(code) {
  const empty = { photos: [], detail: null }
  if (!isApiMode() || !code) return empty
  try {
    const item = await get(`/mini/content/${encodeURIComponent(`product.gallery.${code}`)}`)
    const content = item?.content
    if (item?.type !== 'page' || content?.productCode !== code) return empty
    return {
      photos: Array.isArray(content.photos) ? content.photos : [],
      detail: content.detail && typeof content.detail === 'object' ? content.detail : null,
    }
  } catch (error) {
    // Products without a gallery remain compatible with the single-cover catalog.
    if (Number(error.statusCode) === 404) return empty
    throw error
  }
}

export async function loadProductGallery(code) {
  return (await loadProductPresentation(code)).photos
}

export function productPhotos(product, extraPhotos = []) {
  if (!product) return []
  const sources = [product.image, ...(Array.isArray(extraPhotos) ? extraPhotos : [])]
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(value => /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value))
  const photos = [...new Set(sources.map(productImage))].slice(0, 10)
  return photos.length ? photos : [productImage('')]
}
