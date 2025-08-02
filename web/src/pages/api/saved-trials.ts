import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.id) return res.status(401).json({ error: 'Not authenticated' });
  const userId = session.user.id;

  if (req.method === 'GET') {
    const saved = await prisma.savedTrial.findMany({
      where:  { userId },
      select: { nctId: true, createdAt: true }
    });
    return res.status(200).json(saved);
  }

  if (req.method === 'POST') {
    const { nctId } = req.body;
    if (typeof nctId !== 'string') return res.status(400).json({ error: 'nctId is required' });
    const upserted = await prisma.savedTrial.upsert({
      where:  { userId_nctId: { userId, nctId } },
      create: { userId, nctId },
      update: {}
    });
    return res.status(200).json(upserted);
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
