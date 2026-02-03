import "reflect-metadata";
import app from "./app";
import { AppDataSource } from "./config/database";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { sseService } from "./routes/messages";

async function bootstrap() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    logger.info("Database connection established");

    // Start HTTP server
    const server = app.listen(env.port, () => {
      logger.info(`API server running on port ${env.port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        await sseService.shutdown();
        await AppDataSource.destroy();
        logger.info("Server shut down complete");
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
}

bootstrap();
