import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use server-side session (works reliably in API routes)
  const session = await getServerSession(req, res, authOptions);

  // Require an email on the session (Credentials provider supplies it)
  const email = session?.user?.email;
  if (!email) return res.status(401).json({ error: "Not authenticated" });

  // Resolve userId cleanly without `any`
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const userId = user.id;

  if (req.method === "GET") {
    const saved = await prisma.savedTrial.findMany({
      where: { userId },
      select: { nctId: true, createdAt: true },
    });
    return res.status(200).json(saved);
  }

  if (req.method === "POST") {
    const { nctId } = (req.body ?? {}) as { nctId?: string };
    if (typeof nctId !== "string") {
      return res.status(400).json({ error: "nctId is required" });
    }
    const upserted = await prisma.savedTrial.upsert({
      where: { userId_nctId: { userId, nctId } },
      create: { userId, nctId },
      update: {},
    });
    return res.status(200).json(upserted);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
