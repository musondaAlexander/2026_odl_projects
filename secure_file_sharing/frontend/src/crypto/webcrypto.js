// Client-side end-to-end encryption using the browser-native Web Crypto API.
// No third-party crypto library is used (proposal §3.5).
//
// Scheme: hybrid encryption.
//   - Each file is encrypted with a fresh AES-256-GCM content key.
//   - That content key is WRAPPED (encrypted) with the recipient's RSA-OAEP
//     public key.
//   - The server only ever receives: ciphertext blob + wrapped key + IV.
//   - Only the recipient's private key (which never leaves their device) can
//     unwrap the content key and decrypt the file.

const subtle = globalThis.crypto.subtle

// ---- base64 helpers ----
export function bufToB64(buf) {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function b64ToBuf(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ---- RSA key pair (identity keys) ----
export async function generateIdentityKeyPair() {
  return subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048, // NIST SP 800-57 minimum
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable (so we can persist the private key locally)
    ['encrypt', 'decrypt'],
  )
}

export async function exportPublicKeySpki(publicKey) {
  const spki = await subtle.exportKey('spki', publicKey)
  return bufToB64(spki)
}

export async function importPublicKeySpki(b64) {
  return subtle.importKey(
    'spki',
    b64ToBuf(b64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  )
}

export async function exportPrivateKeyPkcs8(privateKey) {
  const pkcs8 = await subtle.exportKey('pkcs8', privateKey)
  return bufToB64(pkcs8)
}

export async function importPrivateKeyPkcs8(b64) {
  return subtle.importKey(
    'pkcs8',
    b64ToBuf(b64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt'],
  )
}

// SHA-256 fingerprint of the SPKI public key (matches the server's computation).
export async function fingerprintSpki(b64Spki) {
  const enc = new TextEncoder().encode(b64Spki)
  const digest = await subtle.digest('SHA-256', enc)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---- File encryption (hybrid) ----
// Returns { ciphertextBlob, wrappedKeyB64, ivB64 }.
export async function encryptFileForRecipient(fileBytes, recipientPublicKey) {
  const aesKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, fileBytes)

  // Wrap the raw AES key with the recipient's RSA public key.
  const rawAes = await subtle.exportKey('raw', aesKey)
  const wrapped = await subtle.encrypt({ name: 'RSA-OAEP' }, recipientPublicKey, rawAes)

  return {
    ciphertextBlob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    wrappedKeyB64: bufToB64(wrapped),
    ivB64: bufToB64(iv),
  }
}

// ---- File decryption ----
// Returns the decrypted file bytes (ArrayBuffer).
export async function decryptFileFromSender(ciphertextBuf, wrappedKeyB64, ivB64, myPrivateKey) {
  const rawAes = await subtle.decrypt(
    { name: 'RSA-OAEP' },
    myPrivateKey,
    b64ToBuf(wrappedKeyB64),
  )
  const aesKey = await subtle.importKey('raw', rawAes, { name: 'AES-GCM' }, false, ['decrypt'])
  return subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(ivB64)) }, aesKey, ciphertextBuf)
}
