import { Repository } from 'typeorm'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../entities/User'
import { AppDataSource } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { env } from '../config/env'

export interface JwtPayload {
  userId: string
  username: string
}

const SALT_ROUNDS = 10

export class AuthService {
  private repo: Repository<User>

  constructor() {
    this.repo = AppDataSource.getRepository(User)
  }

  async register(
    username: string,
    password: string,
  ): Promise<{ user: Pick<User, 'id' | 'username'>; token: string }> {
    // Check if username already taken
    const existing = await this.repo.findOneBy({ username })
    if (existing) {
      throw new AppError(409, 'Username already taken')
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const user = this.repo.create({ username, passwordHash })
    const saved = await this.repo.save(user)

    const token = this.signToken(saved)

    return {
      user: { id: saved.id, username: saved.username },
      token,
    }
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ user: Pick<User, 'id' | 'username'>; token: string }> {
    const user = await this.repo.findOneBy({ username })
    if (!user) {
      throw new AppError(401, 'Invalid credentials')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new AppError(401, 'Invalid credentials')
    }

    const token = this.signToken(user)

    return {
      user: { id: user.id, username: user.username },
      token,
    }
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.jwtSecret) as JwtPayload
    } catch {
      throw new AppError(401, 'Invalid or expired token')
    }
  }

  private signToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
    }
    return jwt.sign(payload, env.jwtSecret, { expiresIn: '24h' })
  }
}
