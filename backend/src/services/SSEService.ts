import { Response } from "express";
import Redis from "ioredis";
import { env } from "../config/env";
import { Message } from "../entities/Message";
import { Thread } from "../entities/Thread";
import { logger } from "../utils/logger";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const CHANNEL_PREFIX = "thread:";
const GLOBAL_CHANNEL = "threads:global";

export class SSEService {
  private connections = new Map<string, Set<Response>>();
  private globalClients = new Set<Response>();
  private subscriber: Redis;
  private publisher: Redis;

  constructor() {
    this.subscriber = new Redis(env.redisUrl);
    this.publisher = new Redis(env.redisUrl);

    this.subscriber.on("message", (channel: string, data: string) => {
      if (channel === GLOBAL_CHANNEL) {
        this.sendToGlobalClients(data);
      } else {
        const threadId = channel.replace(CHANNEL_PREFIX, "");
        this.sendToClients(threadId, data);
      }
    });

    // Subscribe to the global channel once
    this.subscriber.subscribe(GLOBAL_CHANNEL);

    this.subscriber.on("error", (err) => {
      logger.error("Redis subscriber error", err);
    });

    this.publisher.on("error", (err) => {
      logger.error("Redis publisher error", err);
    });
  }

  /**
   * Register an SSE client for a specific thread.
   * Sets up headers, heartbeat, and cleanup on disconnect.
   */
  addClient(threadId: string, res: Response): void {
    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ threadId })}\n\n`);

    // Track connection
    if (!this.connections.has(threadId)) {
      this.connections.set(threadId, new Set());
      // Subscribe to Redis channel for this thread
      this.subscriber.subscribe(`${CHANNEL_PREFIX}${threadId}`);
    }
    this.connections.get(threadId)!.add(res);

    logger.debug(`SSE client connected to thread ${threadId}`, {
      totalClients: this.connections.get(threadId)!.size,
    });

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, HEARTBEAT_INTERVAL);

    // Cleanup on disconnect
    res.on("close", () => {
      clearInterval(heartbeat);
      this.removeClient(threadId, res);
    });
  }

  /**
   * Register a global SSE client for thread-level events.
   */
  addGlobalClient(res: Response): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.write(`event: connected\ndata: {}\n\n`);

    this.globalClients.add(res);

    logger.debug(`Global SSE client connected`, {
      totalClients: this.globalClients.size,
    });

    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, HEARTBEAT_INTERVAL);

    res.on("close", () => {
      clearInterval(heartbeat);
      this.globalClients.delete(res);
      logger.debug(`Global SSE client disconnected`, {
        remainingClients: this.globalClients.size,
      });
    });
  }

  /**
   * Broadcast a thread creation event to all global SSE clients.
   */
  async broadcastThreadCreated(thread: Thread): Promise<void> {
    const payload = JSON.stringify({ event: "thread_created", data: thread });
    await this.publisher.publish(GLOBAL_CHANNEL, payload);
  }

  /**
   * Broadcast a thread updated event to all global SSE clients.
   */
  async broadcastThreadUpdated(thread: Thread): Promise<void> {
    const payload = JSON.stringify({ event: "thread_updated", data: thread });
    await this.publisher.publish(GLOBAL_CHANNEL, payload);
  }

  /**
   * Broadcast a new message to all SSE clients watching a thread.
   * Publishes to Redis so it works across multiple server instances.
   */
  async broadcastMessage(threadId: string, message: Message): Promise<void> {
    const data = JSON.stringify(message);
    await this.publisher.publish(`${CHANNEL_PREFIX}${threadId}`, data);
  }

  /**
   * Send data directly to all connected clients for a thread.
   * Called by the Redis subscriber when a message is received.
   */
  private sendToClients(threadId: string, data: string): void {
    const clients = this.connections.get(threadId);
    if (!clients || clients.size === 0) return;

    const payload = `event: message\ndata: ${data}\n\n`;
    clients.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        logger.error("Failed to write to SSE client", err);
        this.removeClient(threadId, res);
      }
    });
  }

  private sendToGlobalClients(raw: string): void {
    if (this.globalClients.size === 0) return;

    const { event, data } = JSON.parse(raw);
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.globalClients.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        logger.error("Failed to write to global SSE client", err);
        this.globalClients.delete(res);
      }
    });
  }

  private removeClient(threadId: string, res: Response): void {
    const clients = this.connections.get(threadId);
    if (!clients) return;

    clients.delete(res);
    logger.debug(`SSE client disconnected from thread ${threadId}`, {
      remainingClients: clients.size,
    });

    // Unsubscribe from Redis if no more clients for this thread
    if (clients.size === 0) {
      this.connections.delete(threadId);
      this.subscriber.unsubscribe(`${CHANNEL_PREFIX}${threadId}`);
    }
  }

  /**
   * Graceful shutdown — close all connections and Redis clients.
   */
  async shutdown(): Promise<void> {
    this.connections.forEach((clients) => {
      clients.forEach((res) => {
        try {
          res.end();
        } catch {
          // Client already disconnected
        }
      });
    });
    this.connections.clear();

    this.globalClients.forEach((res) => {
      try {
        res.end();
      } catch {
        // Client already disconnected
      }
    });
    this.globalClients.clear();

    await this.subscriber.quit();
    await this.publisher.quit();
    logger.info("SSE service shut down");
  }
}
