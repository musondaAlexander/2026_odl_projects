import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { b64ToBuf, decryptFileFromSender } from '../crypto/webcrypto.js'
import { loadPrivateKey } from '../crypto/keystore.js'

export default function Inbox() {
  const [box, setBox] = useState('received')
  const [files, setFiles] = useState([])
  const [note, setNote] = useState('')

  async function load() {
    const { data } = await api.get('/files/', { params: { box } })
    setFiles(data)
  }
  useEffect(() => { load() }, [box])

  async function download(f) {
    setNote('Fetching & decrypting…')
    try {
      const priv = await loadPrivateKey()
      const { data } = await api.get(`/files/${f.id}/download/`)
      const ct = b64ToBuf(data.ciphertext_b64)
      const plain = await decryptFileFromSender(ct, data.wrapped_key, data.iv, priv)
      const blob = new Blob([plain], { type: data.mime_type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = data.filename; a.click()
      URL.revokeObjectURL(url)
      setNote('✓ Decrypted locally and downloaded.')
    } catch (e) {
      setNote('✗ ' + (e.response?.data?.detail || e.message))
    }
  }

  async function remove(f) {
    await api.delete(`/files/${f.id}/`)
    load()
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row">
          <h1>Files</h1>
          <span className="spacer" />
          <select style={{ width: 'auto' }} value={box} onChange={(e) => setBox(e.target.value)}>
            <option value="received">Received</option>
            <option value="sent">Sent</option>
          </select>
        </div>
        {note && <p className={note.startsWith('✗') ? 'danger' : 'ok'}>{note}</p>}
        <table>
          <thead><tr><th>File</th><th>{box === 'received' ? 'From' : 'To'}</th><th>Size</th><th></th></tr></thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td>{f.filename}</td>
                <td>{box === 'received' ? f.sender_username : f.recipient_username}</td>
                <td>{(f.size_bytes / 1024).toFixed(1)} KB</td>
                <td className="row">
                  {box === 'received' && <button onClick={() => download(f)}>Decrypt</button>}
                  <button className="secondary" onClick={() => remove(f)}>Delete</button>
                </td>
              </tr>
            ))}
            {files.length === 0 && <tr><td colSpan="4" className="muted">No files.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
