import { Router } from 'express'
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js'
import * as shop from '../controllers/shopController.js'
import * as admin from '../controllers/adminController.js'

const r = Router()

// Public auth
r.post('/auth/register', shop.register)
r.post('/auth/login', shop.login)

// Catalogue (guests allowed; optionalAuth logs views for known users)
r.get('/products', shop.listProducts)
r.get('/products/:id', optionalAuth, shop.getProduct)
r.get('/products/:id/recommendations', optionalAuth, shop.productRecommendations)
r.post('/recommendations/click', optionalAuth, shop.trackRecClick)

// Cart + checkout (customers)
r.get('/cart', authenticate, shop.getCart)
r.post('/cart', authenticate, shop.addToCart)
r.delete('/cart/:productId', authenticate, shop.removeFromCart)
r.post('/checkout', authenticate, shop.checkout)
r.get('/orders', authenticate, shop.myOrders)

// Admin
r.post('/admin/products', authenticate, authorize('admin'), admin.createProduct)
r.patch('/admin/products/:id', authenticate, authorize('admin'), admin.updateProduct)
r.delete('/admin/products/:id', authenticate, authorize('admin'), admin.deleteProduct)
r.get('/admin/orders', authenticate, authorize('admin'), admin.allOrders)
r.get('/admin/analytics', authenticate, authorize('admin'), admin.analytics)
r.get('/admin/users', authenticate, authorize('admin'), admin.listUsers)
r.patch('/admin/users/:id/role', authenticate, authorize('admin'), admin.setUserRole)

export default r
