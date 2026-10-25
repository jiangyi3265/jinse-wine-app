import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import sharp from 'sharp'
const require = createRequire(import.meta.url)
const QRCode = require('qrcode-terminal/vendor/QRCode')
const level = require('qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel')
const [content, output] = process.argv.slice(2)
if (!content || !output) throw new Error('Usage: node ticket-test-qr.mjs <content> <output.png>')
const qr = new QRCode(-1, level.M)
qr.addData(content); qr.make()
const border = 4, scale = 8, cells = qr.getModuleCount(), width = (cells + 2 * border) * scale
const pixels = Buffer.alloc(width * width, 255)
for (let row = 0; row < cells; row++) for (let col = 0; col < cells; col++) if (qr.isDark(row, col))
  for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) pixels[((row + border) * scale + y) * width + (col + border) * scale + x] = 0
await fs.writeFile(output, await sharp(pixels, { raw: { width, height: width, channels: 1 } }).png().toBuffer())
