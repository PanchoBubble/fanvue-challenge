import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm'
import { Message } from './Message'
import { User } from './User'

@Entity('reactions')
@Unique('UQ_reaction_message_user', ['messageId', 'userId'])
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index('IDX_reaction_messageId')
  @Column({ type: 'uuid' })
  messageId: string

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'varchar' })
  type: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
