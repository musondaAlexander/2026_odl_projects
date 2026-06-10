// Local private-key storage. The private key NEVER leaves the device.
// Stored in localStorage as PKCS8 base64; for higher assurance this could be
// wrapped with a passphrase-derived key (PBKDF2) before storage.
import {
  exportPrivateKeyPkcs8,
  exportPublicKeySpki,
  importPrivateKeyPkcs8,
} from './webcrypto.js'

const PRIV_KEY = 'sfs.privateKey.pkcs8'
const PUB_KEY = 'sfs.publicKey.spki'

export async function persistKeyPair(keyPair) {
  const priv = await exportPrivateKeyPkcs8(keyPair.privateKey)
  const pub = await exportPublicKeySpki(keyPair.publicKey)
  localStorage.setItem(PRIV_KEY, priv)
  localStorage.setItem(PUB_KEY, pub)
}

export function hasLocalKey() {
  return Boolean(localStorage.getItem(PRIV_KEY))
}

export function getLocalPublicKeySpki() {
  return localStorage.getItem(PUB_KEY)
}

export async function loadPrivateKey() {
  const b64 = localStorage.getItem(PRIV_KEY)
  if (!b64) throw new Error('No private key on this device. Register or import your key.')
  return importPrivateKeyPkcs8(b64)
}

export function clearLocalKeys() {
  localStorage.removeItem(PRIV_KEY)
  localStorage.removeItem(PUB_KEY)
}
