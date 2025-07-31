// web/src/pages/api/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.method === 'GET') {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });
      return res.status(200).json(profile ?? {});
    } catch (dbErr: unknown) {
      if (
        dbErr instanceof Prisma.PrismaClientKnownRequestError &&
        dbErr.code === 'P2021'
      ) {
        // Missing table: silently return empty
        return res.status(200).json({});
      }
      // Other DB errors rethrow
      console.error('Unexpected DB error in profile:', dbErr);
      return res.status(500).json({ error: 'Database error' });
    }
  }

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

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
