// Seed products, an admin + customers, and a realistic interaction/purchase
// history so the collaborative-filtering pipeline has signal to learn from.
import bcrypt from 'bcryptjs'
import { CartItem, Interaction, Order, OrderItem, Product, User, sequelize } from '../models/index.js'

const PRODUCTS = [
  ['Wireless Earbuds', 'electronics', 350], ['Phone Case', 'electronics', 80],
  ['USB-C Charger', 'electronics', 120], ['Power Bank', 'electronics', 250],
  ['Cotton T-Shirt', 'fashion', 90], ['Denim Jeans', 'fashion', 220],
  ['Sneakers', 'fashion', 400], ['Baseball Cap', 'fashion', 60],
  ['Coffee Mug', 'home', 45], ['Notebook', 'home', 30],
  ['Desk Lamp', 'home', 160], ['Water Bottle', 'home', 70],
]

// Co-purchase groups → these items will become "similar" via CF.
const BASKETS = [
  [0, 3], [0, 1], [2, 3], [4, 7], [5, 6], [6, 7], [8, 9], [10, 9], [0, 2], [5, 7], [8, 11], [4, 5],
]

async function seed() {
  await sequelize.sync({ force: true })
  const pw = await bcrypt.hash('password123', 10)
  await User.create({ name: 'Shop Admin', email: 'admin@shop.zm', passwordHash: pw, role: 'admin' })
  const customers = await User.bulkCreate(
    Array.from({ length: 8 }, (_, i) => ({ name: `Customer ${i + 1}`, email: `c${i + 1}@shop.zm`, passwordHash: pw, role: 'customer' })),
  )
  const products = await Product.bulkCreate(
    PRODUCTS.map(([title, category, price]) => ({ title, category, price, stock: 100, description: `${title} — quality ${category}.` })),
  )

  // Generate co-purchase orders so item-item similarity has structure.
  let bi = 0
  for (const cust of customers) {
    for (let o = 0; o < 3; o++) {
      const basket = BASKETS[bi % BASKETS.length]; bi++
      const order = await Order.create({ UserId: cust.id, total: 0, paymentMethod: 'mtn_momo', status: 'paid', paymentRef: 'SEED' })
      let total = 0
      for (const pidx of basket) {
        const p = products[pidx]
        await OrderItem.create({ OrderId: order.id, ProductId: p.id, quantity: 1, unitPrice: p.price })
        await Interaction.create({ UserId: cust.id, ProductId: p.id, type: 'purchase' })
        total += Number(p.price)
      }
      order.total = total; await order.save()
    }
  }
  console.log('Seed complete. Logins (password123): admin@shop.zm / c1@shop.zm … c8@shop.zm')
  console.log('Now run the CF pipeline:  python ../recsys/build_similarity.py')
  process.exit(0)
}
seed().catch((e) => { console.error(e); process.exit(1) })
