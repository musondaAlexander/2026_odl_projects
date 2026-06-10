import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('customer', 'admin'), defaultValue: 'customer' },
})

export const Product = sequelize.define('Product', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  imageUrl: { type: DataTypes.STRING },
})

export const CartItem = sequelize.define('CartItem', {
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
})

export const Order = sequelize.define('Order', {
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled'), defaultValue: 'pending' },
  paymentMethod: { type: DataTypes.ENUM('mtn_momo', 'airtel_money'), allowNull: false },
  paymentRef: { type: DataTypes.STRING },
})

export const OrderItem = sequelize.define('OrderItem', {
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
})

// Observer-pattern interaction log (drives the user-item matrix).
export const Interaction = sequelize.define('Interaction', {
  type: { type: DataTypes.ENUM('view', 'add_to_cart', 'purchase'), allowNull: false },
})

// Precomputed item-to-item similarities (top-N per product) from the CF job.
export const ItemSimilarity = sequelize.define('ItemSimilarity', {
  productId: { type: DataTypes.INTEGER, allowNull: false },
  similarProductId: { type: DataTypes.INTEGER, allowNull: false },
  score: { type: DataTypes.FLOAT, allowNull: false },
  rank: { type: DataTypes.INTEGER },
}, { timestamps: false }) // written by the Python CF pipeline

// Recommendation impressions/clicks for CTR analytics + A/B evaluation.
export const RecEvent = sequelize.define('RecEvent', {
  productId: { type: DataTypes.INTEGER },          // page where rec was shown
  recommendedId: { type: DataTypes.INTEGER },
  variant: { type: DataTypes.ENUM('personalised', 'baseline'), defaultValue: 'personalised' },
  clicked: { type: DataTypes.BOOLEAN, defaultValue: false },
})

// Associations
User.hasMany(CartItem); CartItem.belongsTo(User)
Product.hasMany(CartItem); CartItem.belongsTo(Product)
User.hasMany(Order); Order.belongsTo(User)
Order.hasMany(OrderItem); OrderItem.belongsTo(Order)
Product.hasMany(OrderItem); OrderItem.belongsTo(Product)
User.hasMany(Interaction); Interaction.belongsTo(User)
Product.hasMany(Interaction); Interaction.belongsTo(Product)

export { sequelize }
