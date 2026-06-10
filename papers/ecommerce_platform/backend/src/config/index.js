import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: process.env.PORT || 4300,
  env: process.env.NODE_ENV || 'development',
  jwt: { secret: process.env.JWT_SECRET || 'dev-secret', expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
  db: {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'ecommerce',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    sqliteStorage: process.env.SQLITE_STORAGE || './ecommerce.dev.sqlite',
  },
  paymentsMode: process.env.PAYMENTS_MODE || 'mock',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5182',
}
