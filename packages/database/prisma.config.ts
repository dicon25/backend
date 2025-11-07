import dotenv from 'dotenv';
import path from 'node:path';
import type { PrismaConfig } from 'prisma';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export default {
  schema:     path.join('prisma', 'schema'),
  migrations: { path: path.join('prisma', 'migrations') },
} satisfies PrismaConfig;
