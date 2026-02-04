import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index({ unique: true })
  @Column({ length: 100 })
  username: string

  @Column()
  passwordHash: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
