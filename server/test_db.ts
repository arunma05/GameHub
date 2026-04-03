import prisma from './database';

async function test() {
  try {
    const count = await prisma.user.count();
    console.log('User count:', count);
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    process.exit();
  }
}

test();
