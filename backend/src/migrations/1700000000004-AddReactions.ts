import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddReactions1700000000004 implements MigrationInterface {
  name = 'AddReactions1700000000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "messageId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "type" varchar NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reaction_message_user" UNIQUE ("messageId", "userId"),
        CONSTRAINT "FK_reaction_message" FOREIGN KEY ("messageId")
          REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reaction_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_reaction_messageId" ON "reactions" ("messageId")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reactions"`)
  }
}
