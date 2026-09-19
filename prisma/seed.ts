export * from '../backend/prisma/seed.ts';
import { seed } from '../backend/prisma/seed.ts';

if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
