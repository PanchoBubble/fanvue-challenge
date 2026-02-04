import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Message } from "./Message";

@Entity("threads")
export class Thread {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  title: string;

  @Index()
  @Column({ type: "timestamptz", default: () => "NOW()" })
  lastMessageAt: Date;

  @Column({ type: "text", nullable: true })
  lastMessageText: string | null;

  @Column({ type: "int", default: 0 })
  unreadCount: number;

  @Column({ type: "int", default: 0 })
  messageCount: number;

  @OneToMany(() => Message, (message) => message.thread)
  messages: Message[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
