import { Sequelize } from 'sequelize'
import { config } from '../config/index.js'

export const sequelize =
  config.db.dialect === 'sqlite'
    ? new Sequelize({ dialect: 'sqlite', storage: config.db.sqliteStorage, logging: false })
    : new Sequelize(config.db.name, config.db.user, config.db.password, {
        host: config.db.host, port: config.db.port, dialect: 'mysql',
        logging: false, define: { charset: 'utf8mb4' },
      })
