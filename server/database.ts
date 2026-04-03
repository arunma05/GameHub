import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// In Prisma 7, we pass the adapter to the constructor
const prisma = new PrismaClient({ adapter } as any);

export default prisma;

// Types for leaderboard entries
export interface LeaderboardEntry {
  name: string;
  score?: number;
  wpm?: number;
  time?: number;
  moves?: number;
  level?: number;
}
