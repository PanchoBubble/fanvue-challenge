import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLastMessageText1700000000002 implements MigrationInterface {
  name = 'AddLastMessageText1700000000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "threads"
      ADD COLUMN "lastMessageText" text
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "threads"
      DROP COLUMN "lastMessageText"
    `)
  }
}
