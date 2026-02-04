import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { env } from './env'
import { Thread } from '../entities/Thread'
import { Message } from '../entities/Message'
import { User } from '../entities/User'
import { CreateSchema1700000000000 } from '../migrations/1700000000000-CreateSchema'
import { AddUsers1700000000001 } from '../migrations/1700000000001-AddUsers'
import { AddLastMessageText1700000000002 } from '../migrations/1700000000002-AddLastMessageText'
import { AddMessageNumber1700000000003 } from '../migrations/1700000000003-AddMessageNumber'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  entities: [Thread, Message, User],
  migrations: [
    CreateSchema1700000000000,
    AddUsers1700000000001,
    AddLastMessageText1700000000002,
    AddMessageNumber1700000000003,
  ],
  synchronize: false,
  logging: env.nodeEnv === 'development',
})
