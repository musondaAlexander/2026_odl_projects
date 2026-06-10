import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api, auth } from './api.js'
import Admin from './pages/Admin.jsx'

function Nav({ cartCount }) {
  const u = auth.user(); const navigate = useNavigate()
  return (
    <nav className="nav">
      <strong>🛍️ ZedShop</strong>
      <NavLink to="/">Shop</NavLink>
      {u && <NavLink to="/orders">Orders</NavLink>}
      {u?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      <span className="spacer" />
      <NavLink to="/cart">Cart <span className="cartcount">{cartCount}</span></NavLink>
      {u ? <button className="secondary" onClick={() => { auth.logout(); navigate('/login') }}>Logout</button>
        : <NavLink to="/login">Sign in</NavLink>}
    </nav>
  )
}

export default function App() {
  const [cartCount, setCartCount] = useState(0)
  const refreshCart = async () => { if (auth.user()) { const { data } = await api.get('/cart'); setCartCount(data.items.length) } }
  useEffect(() => { refreshCart() }, [])
  return (
    <>
      <Nav cartCount={cartCount} />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<ProductDetail onCart={refreshCart} />} />
        <Route path="/cart" element={<Cart onChange={refreshCart} />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={auth.user()?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
      </Routes>
    </>
  )
}

function Catalog() {
  const [products, setProducts] = useState([]); const [q, setQ] = useState('')
  useEffect(() => { api.get('/products', { params: { q } }).then((r) => setProducts(r.data.products)) }, [q])
  return (
    <div className="container">
      <input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 360 }} />
      <div className="grid">
        {products.map((p) => (
          <a key={p.id} className="card product" href={`/product/${p.id}`}>
            <span className="badge">{p.category}</span>
            <h2>{p.title}</h2>
            <div className="price">K{p.price}</div>
            <div className="muted">{p.stock} in stock</div>
          </a>
        ))}
      </div>
    </div>
  )
}

function ProductDetail({ onCart }) {
  const { id } = useParams()
  const [product, setProduct] = useState(null); const [recs, setRecs] = useState([]); const [msg, setMsg] = useState('')
  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data.product))
    api.get(`/products/${id}/recommendations`).then((r) => setRecs(r.data.recommendations))
  }, [id])
  async function add() {
    if (!auth.user()) { setMsg('Please sign in to add to cart.'); return }
    await api.post('/cart', { productId: Number(id), quantity: 1 }); setMsg('✓ Added to cart'); onCart()
  }
  if (!product) return <div className="container"><p className="muted">Loading…</p></div>
  return (
    <div className="container">
      <div className="card">
        <span className="badge">{product.category}</span>
        <h1>{product.title}</h1>
        <p className="muted">{product.description}</p>
        <div className="price">K{product.price}</div>
        <div className="row"><button onClick={add}>Add to cart</button>{msg && <span className="ok">{msg}</span>}</div>
      </div>
      <h2>Customers Also Bought</h2>
      <div className="grid">
        {recs.map((p) => (
          <a key={p.id} className="card product" href={`/product/${p.id}`} onClick={() => api.post('/recommendations/click', { productId: Number(id), recommendedId: p.id })}>
            <h2>{p.title}</h2><div className="price">K{p.price}</div>
          </a>
        ))}
        {recs.length === 0 && <p className="muted">No recommendations yet.</p>}
      </div>
    </div>
  )
}

function Cart({ onChange }) {
  const [cart, setCart] = useState({ items: [], total: 0 })
  const [method, setMethod] = useState('mtn_momo'); const [phone, setPhone] = useState(''); const [msg, setMsg] = useState('')
  const load = () => api.get('/cart').then((r) => setCart(r.data)).catch(() => {})
  useEffect(() => { load() }, [])
  async function checkout() {
    setMsg('')
    try {
      const { data } = await api.post('/checkout', { paymentMethod: method, phone })
      setMsg(data.order.status === 'paid' ? `✓ Paid — ${data.payment.ref}` : `✗ Payment ${data.payment.status}`)
      load(); onChange()
    } catch (e) { setMsg('✗ ' + (e.response?.data?.error || 'Checkout failed')) }
  }
  if (!auth.user()) return <div className="container"><p className="muted">Sign in to view your cart.</p></div>
  return (
    <div className="container">
      <div className="card">
        <h1>Cart</h1>
        {cart.items.map((i) => (
          <div key={i.id} className="row" style={{ justifyContent: 'space-between' }}>
            <span>{i.Product.title} × {i.quantity}</span>
            <span className="row"><b>K{(i.quantity * i.Product.price).toFixed(2)}</b>
              <button className="secondary" onClick={async () => { await api.delete(`/cart/${i.ProductId}`); load(); onChange() }}>Remove</button></span>
          </div>
        ))}
        {cart.items.length === 0 && <p className="muted">Your cart is empty.</p>}
        <h2>Total: K{cart.total.toFixed(2)}</h2>
        {cart.items.length > 0 && (
          <>
            <div className="row">
              <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: 180 }}>
                <option value="mtn_momo">MTN MoMo</option><option value="airtel_money">Airtel Money</option>
              </select>
              <input placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: 200 }} />
              <button onClick={checkout} disabled={!phone}>Pay</button>
            </div>
            {msg && <p className={msg.startsWith('✗') ? 'danger' : 'ok'}>{msg}</p>}
            <p className="muted">Demo gateway: any number works; numbers ending in 0 simulate a failed payment.</p>
          </>
        )}
      </div>
    </div>
  )
}

function Orders() {
  const [orders, setOrders] = useState([])
  useEffect(() => { api.get('/orders').then((r) => setOrders(r.data.orders)).catch(() => {}) }, [])
  return (
    <div className="container"><div className="card"><h1>My orders</h1>
      <table><thead><tr><th>Ref</th><th>Total</th><th>Method</th><th>Status</th></tr></thead><tbody>
        {orders.map((o) => <tr key={o.id}><td>{o.paymentRef}</td><td>K{o.total}</td><td>{o.paymentMethod}</td><td>{o.status}</td></tr>)}
      </tbody></table></div></div>
  )
}

function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: 'c1@shop.zm', password: 'password123' })
  const [error, setError] = useState(''); const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault(); setError('')
    try {
      if (mode === 'login') await auth.login(form.email, form.password)
      else await auth.register(form.name, form.email, form.password)
      navigate('/')
    } catch (err) { setError(err.response?.data?.error || 'Failed') }
  }
  return (
    <div className="center">
      <form className="card" style={{ width: 380 }} onSubmit={submit}>
        <h1>{mode === 'login' ? 'Sign in' : 'Register'}</h1>
        {mode === 'register' && <input placeholder="Name" value={form.name} onChange={set('name')} />}
        <input placeholder="Email" value={form.email} onChange={set('email')} />
        <input type="password" placeholder="Password" value={form.password} onChange={set('password')} />
        {error && <p className="danger">{error}</p>}
        <button type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="muted" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ cursor: 'pointer' }}>
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}</p>
        <p className="muted">Demo: admin@shop.zm / c1@shop.zm — password123</p>
      </form>
    </div>
  )
}
