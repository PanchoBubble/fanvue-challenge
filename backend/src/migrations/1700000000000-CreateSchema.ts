import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSchema1700000000000 implements MigrationInterface {
  name = "CreateSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "threads" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "lastMessageAt" timestamptz NOT NULL DEFAULT NOW(),
        "unreadCount" int NOT NULL DEFAULT 0,
        "messageCount" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_threads" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "threadId" uuid NOT NULL,
        "text" text NOT NULL,
        "author" varchar(100) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_thread" FOREIGN KEY ("threadId")
          REFERENCES "threads"("id") ON DELETE CASCADE
      )
    `);

    // Composite index for cursor-based pagination (threadId + createdAt)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_message_thread_created"
        ON "messages" ("threadId", "createdAt")
    `);

    // Index for ordering threads by last activity
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_thread_last_message"
        ON "threads" ("lastMessageAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "threads"`);
  }
}
