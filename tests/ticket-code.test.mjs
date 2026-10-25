import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateTicketImage, ticketImageSource, removeTicketImage } from '../services/ticket-code.js'
test('original ticket images accept PNG and JPEG base64 only', () => {
  assert.equal(validateTicketImage('data:image/png;base64,YWJjZA=='), 'data:image/png;base64,YWJjZA==')
  assert.equal(validateTicketImage('data:image/jpeg;base64,YWJj'), 'data:image/jpeg;base64,YWJj')
  for (const value of ['', 'https://example.com/ticket.png', 'data:image/svg+xml;base64,YWJj', 'data:image/png;base64,<script>', null])
    assert.throws(() => validateTicketImage(value))
  assert.throws(() => validateTicketImage('data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024)))
})

test('WeChat file adapter writes original image bytes and removes only ticket files', async () => {
  const writes = [], deleted = []
  globalThis.wx = { env: { USER_DATA_PATH: 'wxfile://usr' } }
  globalThis.uni = { getFileSystemManager: () => ({
    writeFile(options) { writes.push(options); options.success() },
    unlink(options) { deleted.push(options.filePath) },
  }) }
  try {
    const source = await ticketImageSource('data:image/png;base64,YWJjZA==')
    assert.match(source, /^wxfile:\/\/usr\/jinse-ticket-.+\.png$/)
    assert.equal(writes[0].encoding, 'base64')
    assert.equal(Buffer.from(writes[0].data, 'base64').toString(), 'abcd')
    removeTicketImage(source)
    removeTicketImage('wxfile://usr/avatar.png')
    assert.deepEqual(deleted, [source])
  } finally { delete globalThis.uni; delete globalThis.wx }
})

test('WeChat file write failure produces an actionable error without a usable source', async () => {
  globalThis.wx = { env: { USER_DATA_PATH: 'wxfile://usr' } }
  globalThis.uni = { getFileSystemManager: () => ({ writeFile(options) { options.fail() } }) }
  try { await assert.rejects(ticketImageSource('data:image/jpeg;base64,YWJj'), /读取失败/) }
  finally { delete globalThis.uni; delete globalThis.wx }
})
