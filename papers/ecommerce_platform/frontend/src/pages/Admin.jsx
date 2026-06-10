import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Admin() {
  const [tab, setTab] = useState('analytics')
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ title: '', category: 'electronics', price: '', stock: '' })

  useEffect(() => {
    api.get('/admin/analytics').then((r) => setStats(r.data))
    api.get('/products').then((r) => setProducts(r.data.products))
  }, [])

  async function createProduct(e) {
    e.preventDefault()
    await api.post('/admin/products', { ...form, price: Number(form.price), stock: Number(form.stock || 0) })
    setForm({ title: '', category: 'electronics', price: '', stock: '' })
    api.get('/products').then((r) => setProducts(r.data.products))
  }

  return (
    <div className="container">
      <div className="row"><button className="secondary" onClick={() => setTab('analytics')}>Analytics</button>
        <button className="secondary" onClick={() => setTab('inventory')}>Inventory</button></div>

      {tab === 'analytics' && stats && (
        <div className="card">
          <h1>Analytics</h1>
          <div className="grid">
            <div className="card"><div className="muted">Products</div><h1>{stats.products}</h1></div>
            <div className="card"><div className="muted">Paid orders</div><h1>{stats.paidOrders}</h1></div>
            <div className="card"><div className="muted">Revenue</div><h1>K{stats.revenue}</h1></div>
          </div>
          <h2>Recommendation CTR (A/B)</h2>
          <table><thead><tr><th>Variant</th><th>Shown</th><th>Clicked</th><th>CTR</th></tr></thead><tbody>
            {['personalised', 'baseline'].map((v) => (
              <tr key={v}><td>{v}</td><td>{stats.recommendationCtr[v].shown}</td>
                <td>{stats.recommendationCtr[v].clicked}</td><td>{stats.recommendationCtr[v].ctr}%</td></tr>
            ))}
          </tbody></table>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="card">
          <h1>Inventory</h1>
          <form onSubmit={createProduct} className="row">
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: 180 }} />
            <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: 130 }} />
            <input placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ width: 100 }} />
            <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ width: 100 }} />
            <button type="submit" disabled={!form.title || !form.price}>Add</button>
          </form>
          <table><thead><tr><th>Title</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead><tbody>
            {products.map((p) => <tr key={p.id}><td>{p.title}</td><td>{p.category}</td><td>K{p.price}</td><td>{p.stock}</td></tr>)}
          </tbody></table>
        </div>
      )}
    </div>
  )
}
