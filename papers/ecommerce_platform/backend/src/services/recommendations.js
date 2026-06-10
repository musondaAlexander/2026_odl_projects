// Recommendation serving: top-N "Customers Also Bought" from the precomputed
// item-to-item similarity matrix (sub-500ms lookup, per Linden et al. 2003).
// Supports an A/B flag: 'personalised' (CF) vs 'baseline' (popularity).
import { fn, col, literal } from 'sequelize'
import { ItemSimilarity, OrderItem, Product, RecEvent } from '../models/index.js'

export async function topNForProduct(productId, n = 5, variant = 'personalised') {
  if (variant === 'baseline') return popularityTopN(n, productId)

  const sims = await ItemSimilarity.findAll({
    where: { productId },
    order: [['score', 'DESC']],
    limit: n,
  })
  if (sims.length === 0) return popularityTopN(n, productId) // cold-start fallback

  const ids = sims.map((s) => s.similarProductId)
  const products = await Product.findAll({ where: { id: ids } })
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))
  return sims.map((s) => byId[s.similarProductId]).filter(Boolean)
}

// Popularity baseline = most-purchased products (excluding the seed product).
async function popularityTopN(n, excludeId) {
  const rows = await OrderItem.findAll({
    attributes: ['ProductId', [fn('SUM', col('quantity')), 'sold']],
    group: ['ProductId'],
    order: [[literal('sold'), 'DESC']],
    limit: n + 1,
  })
  const ids = rows.map((r) => r.ProductId).filter((id) => id !== excludeId).slice(0, n)
  if (ids.length === 0) {
    return Product.findAll({ order: [['createdAt', 'DESC']], limit: n })
  }
  const products = await Product.findAll({ where: { id: ids } })
  return products
}

export async function logImpressions(productId, recommended, variant) {
  await Promise.all(
    recommended.map((r) =>
      RecEvent.create({ productId, recommendedId: r.id, variant, clicked: false }),
    ),
  )
}
