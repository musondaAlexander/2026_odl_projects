import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: process.env.PORT || 4200,
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  db: {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'hospital',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    sqliteStorage: process.env.SQLITE_STORAGE || './hospital.dev.sqlite',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5180',
}
