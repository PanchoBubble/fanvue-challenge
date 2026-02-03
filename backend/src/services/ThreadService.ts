import { Repository } from "typeorm";
import { Thread } from "../entities/Thread";
import { AppDataSource } from "../config/database";
import { AppError } from "../middleware/errorHandler";

export class ThreadService {
  private repo: Repository<Thread>;

  constructor() {
    this.repo = AppDataSource.getRepository(Thread);
  }

  async getAll(search?: string): Promise<Thread[]> {
    const qb = this.repo
      .createQueryBuilder("thread")
      .orderBy("thread.lastMessageAt", "DESC");

    if (search && search.trim().length > 0) {
      qb.where("thread.title ILIKE :search", {
        search: `%${search.trim()}%`,
      });
    }

    return qb.getMany();
  }

  async getById(id: string): Promise<Thread> {
    const thread = await this.repo.findOneBy({ id });
    if (!thread) {
      throw new AppError(404, "Thread not found");
    }
    return thread;
  }

  async updateLastMessage(
    threadId: string,
    lastMessageAt: Date
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Thread)
      .set({
        lastMessageAt,
        messageCount: () => '"messageCount" + 1',
      })
      .where("id = :id", { id: threadId })
      .execute();
  }
}
