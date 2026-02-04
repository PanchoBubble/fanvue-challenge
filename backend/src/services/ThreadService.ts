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

  async create(title: string): Promise<Thread> {
    const thread = this.repo.create({ title });
    return this.repo.save(thread);
  }

  async update(id: string, title: string): Promise<Thread> {
    const thread = await this.getById(id);
    thread.title = title;
    return this.repo.save(thread);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.repo.delete(id);
  }

  async updateLastMessage(
    threadId: string,
    lastMessageAt: Date,
    lastMessageText: string
  ): Promise<Thread> {
    await this.repo
      .createQueryBuilder()
      .update(Thread)
      .set({
        lastMessageAt,
        lastMessageText,
        messageCount: () => '"messageCount" + 1',
      })
      .where("id = :id", { id: threadId })
      .execute();

    return this.getById(threadId);
  }
}
