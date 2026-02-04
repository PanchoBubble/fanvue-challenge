import 'reflect-metadata'
import { AppDataSource } from '../config/database'
import bcrypt from 'bcryptjs'
import { Thread } from '../entities/Thread'
import { Message } from '../entities/Message'
import { User } from '../entities/User'
import { logger } from '../utils/logger'

const THREAD_DEFINITIONS = [
  { title: 'Project Alpha - Sprint Planning', messageCount: 20_000 },
  { title: 'Design Review: New Dashboard', messageCount: 350 },
  { title: 'Bug Report: Login Issues', messageCount: 120 },
  { title: 'Feature Request: Dark Mode', messageCount: 200 },
  { title: 'Team Standup Notes', messageCount: 500 },
  { title: 'API Integration Discussion', messageCount: 180 },
  { title: 'Performance Optimization', messageCount: 90 },
  { title: 'Release v2.0 Checklist', messageCount: 75 },
  { title: 'Customer Feedback Summary', messageCount: 250 },
  { title: 'Infrastructure & DevOps', messageCount: 150 },
]

const AUTHORS = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Eve',
  'Frank',
  'Grace',
  'Henry',
  'Ivy',
  'Jack',
]

const SAMPLE_MESSAGES = [
  "Sounds good, let's move forward with this approach.",
  "I've pushed the latest changes to the branch.",
  'Can someone review my PR when they get a chance?',
  'The tests are passing now after the fix.',
  'I think we should reconsider the architecture here.',
  'Great progress on this! Keep it up.',
  "I'll take a look at this after lunch.",
  'We need to address the performance issues first.',
  'Has anyone tested this on mobile?',
  'Let me check the logs and get back to you.',
  'The deployment went smoothly, no issues reported.',
  "I've updated the documentation accordingly.",
  'Can we schedule a quick call to discuss this?',
  'The client is happy with the latest demo.',
  'We should add more test coverage for this module.',
  'I found a potential memory leak in the service.',
  'The new API endpoint is ready for integration.',
  "Let's prioritize this for the next sprint.",
  "I've created a ticket for tracking this issue.",
  'The database migration ran successfully.',
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function seed(): Promise<string> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize()
  }

  const threadRepo = AppDataSource.getRepository(Thread)
  const messageRepo = AppDataSource.getRepository(Message)
  const userRepo = AppDataSource.getRepository(User)

  // Check if data already exists (idempotent)
  const existingCount = await threadRepo.count()
  if (existingCount > 0) {
    logger.info('Seed data already exists, skipping.')
    return 'Seed data already exists, skipping.'
  }

  logger.info('Seeding database...')
  const startTime = Date.now()

  // Create default users (password = username for dev convenience)
  const passwordHash = await bcrypt.hash('password', 10)
  for (const name of AUTHORS) {
    await userRepo.save(userRepo.create({ username: name, passwordHash }))
  }
  logger.info(`Seeded ${AUTHORS.length} users (password: "password" for all)`)

  for (const def of THREAD_DEFINITIONS) {
    // Create thread
    const thread = threadRepo.create({
      title: def.title,
      messageCount: def.messageCount,
    })
    const savedThread = await threadRepo.save(thread)

    logger.info(
      `Seeding thread: "${def.title}" with ${def.messageCount} messages...`,
    )

    // Generate messages in batches for performance
    const BATCH_SIZE = 1000
    let currentTime = new Date('2024-01-01T00:00:00Z').getTime()
    let lastCreatedAt = new Date(currentTime)
    let lastText = ''

    for (let i = 0; i < def.messageCount; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, def.messageCount)
      const batch: Partial<Message>[] = []

      for (let j = i; j < batchEnd; j++) {
        // Spread messages over time (1-5 minutes apart)
        currentTime += 60_000 + Math.random() * 240_000
        lastCreatedAt = new Date(currentTime)
        lastText = randomItem(SAMPLE_MESSAGES)

        batch.push({
          threadId: savedThread.id,
          text: lastText,
          author: randomItem(AUTHORS),
          messageNumber: j + 1,
          createdAt: lastCreatedAt,
        })
      }

      await messageRepo
        .createQueryBuilder()
        .insert()
        .into(Message)
        .values(batch)
        .execute()
    }

    // Update thread's lastMessageAt and lastMessageText
    await threadRepo.update(savedThread.id, {
      lastMessageAt: lastCreatedAt,
      lastMessageText: lastText,
    })
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const totalMessages = THREAD_DEFINITIONS.reduce(
    (sum, d) => sum + d.messageCount,
    0,
  )
  const msg = `Seeding complete: ${THREAD_DEFINITIONS.length} threads, ${totalMessages} messages in ${elapsed}s`
  logger.info(msg)
  return msg
}

// Run as standalone script (npm run seed)
if (require.main === module) {
  seed()
    .then(async () => {
      await AppDataSource.destroy()
    })
    .catch(async (err) => {
      logger.error('Seed failed', err)
      await AppDataSource.destroy()
      process.exit(1)
    })
}
