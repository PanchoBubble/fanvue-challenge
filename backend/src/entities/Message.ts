import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { Thread } from "./Thread";

@Entity("messages")
@Index("idx_message_thread_created", ["threadId", "createdAt"])
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  threadId: string;

  @ManyToOne(() => Thread, (thread) => thread.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "threadId" })
  thread: Thread;

  @Column({ type: "text" })
  text: string;

  @Column({ length: 100 })
  author: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
