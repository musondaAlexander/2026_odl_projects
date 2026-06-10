import { useState } from 'react'
import { api } from '../api/client.js'
import { importPublicKeySpki, encryptFileForRecipient } from '../crypto/webcrypto.js'

export default function Send() {
  const [recipient, setRecipient] = useState('')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSend(e) {
    e.preventDefault()
    if (!file) return
    setBusy(true); setStatus('Looking up recipient key…')
    try {
      const { data: rec } = await api.get('/accounts/keys/lookup/', { params: { q: recipient } })
      setStatus('Encrypting on this device…')
      const pub = await importPublicKeySpki(rec.public_key_spki)
      const bytes = await file.arrayBuffer()
      const { ciphertextBlob, wrappedKeyB64, ivB64 } = await encryptFileForRecipient(bytes, pub)

      setStatus('Uploading ciphertext…')
      const fd = new FormData()
      fd.append('recipient', rec.username)
      fd.append('filename', file.name)
      fd.append('mime_type', file.type || 'application/octet-stream')
      fd.append('wrapped_key', wrappedKeyB64)
      fd.append('iv', ivB64)
      fd.append('recipient_key_fingerprint', rec.fingerprint)
      fd.append('ciphertext', ciphertextBlob, file.name + '.enc')
      await api.post('/files/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStatus('✓ Sent. The server only ever received ciphertext.')
      setFile(null)
    } catch (err) {
      setStatus('✗ ' + (err.response?.data?.detail || err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Send an encrypted file</h1>
        <form onSubmit={onSend}>
          <input placeholder="Recipient username or email" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          {status && <p className={status.startsWith('✗') ? 'danger' : 'ok'}>{status}</p>}
          <button type="submit" disabled={busy || !file || !recipient}>Encrypt & send</button>
        </form>
        <p className="muted">The file is encrypted in your browser with the recipient's public key before upload.</p>
      </div>
    </div>
  )
}
