import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { generateIdentityKeyPair, exportPublicKeySpki, fingerprintSpki } from '../crypto/webcrypto.js'
import { persistKeyPair, hasLocalKey, getLocalPublicKeySpki, clearLocalKeys } from '../crypto/keystore.js'

export default function KeySetup() {
  const [serverKey, setServerKey] = useState(null)
  const [localFp, setLocalFp] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function refresh() {
    try {
      const { data } = await api.get('/accounts/keys/')
      setServerKey(data)
    } catch {
      setServerKey(null)
    }
    if (hasLocalKey()) setLocalFp(await fingerprintSpki(getLocalPublicKeySpki()))
  }

  useEffect(() => { refresh() }, [])

  async function generateAndRegister() {
    setBusy(true); setMsg('')
    try {
      const keyPair = await generateIdentityKeyPair()
      await persistKeyPair(keyPair) // private key stays on this device
      const spki = await exportPublicKeySpki(keyPair.publicKey)
      await api.post('/accounts/keys/', { algorithm: 'RSA-OAEP', public_key_spki: spki })
      setMsg('Identity key generated. Private key stored on this device only.')
      await refresh()
    } catch (e) {
      setMsg('Failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setBusy(false)
    }
  }

  const mismatch = serverKey && localFp && serverKey.fingerprint !== localFp

  return (
    <div className="container">
      <div className="card">
        <h1>My identity key</h1>
        <p className="muted">
          Your private key is generated in this browser and never sent to the server.
          The server holds only your public key, so only you can decrypt files sent to you.
        </p>
        <table>
          <tbody>
            <tr><td>Public key on server</td><td>{serverKey ? <code>{serverKey.fingerprint.slice(0, 24)}…</code> : <span className="muted">none</span>}</td></tr>
            <tr><td>Private key on this device</td><td>{localFp ? <code>{localFp.slice(0, 24)}…</code> : <span className="muted">none</span>}</td></tr>
          </tbody>
        </table>
        {mismatch && <p className="danger">⚠ Your device key does not match the server key. You won't be able to decrypt files sent to the server key.</p>}
        {msg && <p className="ok">{msg}</p>}
        <div className="row">
          <button onClick={generateAndRegister} disabled={busy}>
            {serverKey ? 'Regenerate & replace key' : 'Generate identity key'}
          </button>
          {hasLocalKey() && <button className="secondary" onClick={() => { clearLocalKeys(); refresh() }}>Forget local key</button>}
        </div>
      </div>
    </div>
  )
}
