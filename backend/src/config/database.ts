import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env";
import { Thread } from "../entities/Thread";
import { Message } from "../entities/Message";
import { User } from "../entities/User";
import { CreateSchema1700000000000 } from "../migrations/1700000000000-CreateSchema";
import { AddUsers1700000000001 } from "../migrations/1700000000001-AddUsers";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  entities: [Thread, Message, User],
  migrations: [CreateSchema1700000000000, AddUsers1700000000001],
  synchronize: false,
  logging: env.nodeEnv === "development",
});
