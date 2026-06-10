// Observer pattern: a single place that records user-item interaction events.
// Controllers "notify" this observer on view / add-to-cart / purchase; the
// recommendation pipeline consumes the resulting log.
import { Interaction } from '../models/index.js'

const observers = []

export function subscribe(fn) {
  observers.push(fn)
}

export async function recordInteraction({ userId, productId, type }) {
  const event = await Interaction.create({ UserId: userId || null, ProductId: productId, type })
  for (const obs of observers) {
    try { obs(event) } catch { /* observers must not break the request */ }
  }
  return event
}
