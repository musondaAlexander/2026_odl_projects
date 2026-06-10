// Payment gateway abstraction. The mock provider simulates MTN MoMo / Airtel
// Money request-to-pay so the platform is fully runnable without live merchant
// credentials. Swap in a real provider implementing the same interface later.
import crypto from 'node:crypto'
import { config } from '../config/index.js'

class MockGateway {
  async requestToPay({ method, amount, phone }) {
    // Simulate provider behaviour: a phone ending in 0 "fails", else succeeds.
    const ref = `${method.toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`
    const success = !(phone || '').endsWith('0')
    return { success, ref, status: success ? 'SUCCESSFUL' : 'FAILED', provider: method, amount }
  }
}

// A real implementation would call the MTN MoMo Collections / Airtel APIs here.
class LiveGateway {
  async requestToPay() {
    throw new Error('Live payment provider not configured. Set PAYMENTS_MODE=mock or add credentials.')
  }
}

export const paymentGateway = config.paymentsMode === 'live' ? new LiveGateway() : new MockGateway()
