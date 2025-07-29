// web/src/pages/api/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) Verify authentication
  const session = await getSession({ req });
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // 2) Lookup user in DB
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // 3) GET → return existing profile
  if (req.method === 'GET') {
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });
    return res.status(200).json(profile);
  }

  // 4) POST → create or update
  if (req.method === 'POST') {
    const { zip, radius, age, gender, phase } = req.body;
    const data = { zip, radius, age, gender, phase, userId: user.id };

    const profile = await prisma.profile.upsert({
      where:  { userId: user.id },
      update: data,
      create: data,
    });
    return res.status(200).json(profile);
  }

  // 5) Other methods not allowed
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
