import { assetUrl, mediaUrl } from './config.js'

export const DEFAULT_PRODUCT_IMAGE_PATH = '/static/design/product-placeholder.jpg'

/** Return one consistent product image for empty or invalid catalog image values. */
export function defaultProductImage() {
  // WeChat bundles this file locally, so empty products do not depend on a server asset.
  if (typeof wx !== 'undefined') return DEFAULT_PRODUCT_IMAGE_PATH
  return assetUrl(DEFAULT_PRODUCT_IMAGE_PATH)
}

export function productImage(value) {
  const source = typeof value === 'string' ? value.trim() : ''
  if (!source) return defaultProductImage()
  return mediaUrl(source)
}
