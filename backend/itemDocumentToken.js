const crypto = require('node:crypto')

function getSecret() {
  const secret = process.env.QR_DOCUMENT_SECRET

  if (!secret || Buffer.byteLength(secret) < 32) {
    const error = new Error('QR_DOCUMENT_SECRET must contain at least 32 bytes')
    error.code = 'QR_DOCUMENT_SECRET_MISSING'
    throw error
  }

  return secret
}

function normalizeOrigin(origin) {
  if (typeof origin !== 'string') {
    return null
  }

  try {
    const parsedOrigin = new URL(origin)

    if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin) {
      return null
    }

    return parsedOrigin.origin
  } catch {
    return null
  }
}

function createItemDocumentToken(itemId, origin) {
  const normalizedOrigin = normalizeOrigin(origin)

  if (!normalizedOrigin) {
    throw new Error('A valid application origin is required to create the document link')
  }

  const encodedOrigin = Buffer.from(normalizedOrigin).toString('base64url')
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(`${itemId}:${normalizedOrigin}`)
    .digest('hex')

  return `${encodedOrigin}.${signature}`
}

function verifyItemDocumentToken(itemId, token) {
  if (typeof token !== 'string') {
    return null
  }

  const [encodedOrigin, providedSignature, ...extraParts] = token.split('.')

  if (
    extraParts.length ||
    !encodedOrigin ||
    !/^[a-f0-9]{64}$/i.test(providedSignature || '')
  ) {
    return null
  }

  let origin

  try {
    origin = normalizeOrigin(Buffer.from(encodedOrigin, 'base64url').toString())
  } catch {
    return null
  }

  if (!origin) {
    return null
  }

  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(`${itemId}:${origin}`)
    .digest()
  const providedSignatureBytes = Buffer.from(providedSignature, 'hex')

  if (
    expectedSignature.length !== providedSignatureBytes.length ||
    !crypto.timingSafeEqual(expectedSignature, providedSignatureBytes)
  ) {
    return null
  }

  return origin
}

module.exports = {
  createItemDocumentToken,
  verifyItemDocumentToken
}
