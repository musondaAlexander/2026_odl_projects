// @vitest-environment node
// Round-trip test proving the server-blind E2EE property: a file encrypted for a
// recipient can ONLY be decrypted with that recipient's private key.
// Runs in the Node environment so Web Crypto (crypto.subtle) and Blob.arrayBuffer
// are the real platform implementations, not jsdom shims.
import { describe, expect, it } from 'vitest'
import {
  generateIdentityKeyPair,
  exportPublicKeySpki,
  importPublicKeySpki,
  encryptFileForRecipient,
  decryptFileFromSender,
} from './webcrypto.js'

describe('Web Crypto E2EE round-trip', () => {
  it('encrypts for a recipient and only their private key decrypts it', async () => {
    const recipient = await generateIdentityKeyPair()
    const spki = await exportPublicKeySpki(recipient.publicKey)
    const importedPub = await importPublicKeySpki(spki)

    const plaintext = new TextEncoder().encode('Top secret contract — Zambia 2026')
    const { ciphertextBlob, wrappedKeyB64, ivB64 } = await encryptFileForRecipient(
      plaintext,
      importedPub,
    )

    const ctBuf = await ciphertextBlob.arrayBuffer()
    const decrypted = await decryptFileFromSender(
      ctBuf,
      wrappedKeyB64,
      ivB64,
      recipient.privateKey,
    )
    expect(new TextDecoder().decode(decrypted)).toBe('Top secret contract — Zambia 2026')
  })

  it('rejects decryption with the wrong private key', async () => {
    const recipient = await generateIdentityKeyPair()
    const attacker = await generateIdentityKeyPair()
    const pub = await importPublicKeySpki(await exportPublicKeySpki(recipient.publicKey))

    const { ciphertextBlob, wrappedKeyB64, ivB64 } = await encryptFileForRecipient(
      new TextEncoder().encode('secret'),
      pub,
    )
    const ctBuf = await ciphertextBlob.arrayBuffer()
    await expect(
      decryptFileFromSender(ctBuf, wrappedKeyB64, ivB64, attacker.privateKey),
    ).rejects.toThrow()
  })
})
