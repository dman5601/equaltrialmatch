// web/src/pages/api/saved-trials/[nctId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession }                from 'next-auth/react';
import { PrismaClient }              from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const userId = session.user.id;
  const rawId  = req.query.nctId;
  const nctId  = Array.isArray(rawId) ? rawId[0] : rawId;

  if (req.method === 'DELETE') {
    await prisma.savedTrial.deleteMany({
      where: { userId, nctId }
    });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
