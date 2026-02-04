import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMessageNumber1700000000003 implements MigrationInterface {
  name = 'AddMessageNumber1700000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN "messageNumber" integer NOT NULL DEFAULT 0
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN "messageNumber"
    `)
  }
}
