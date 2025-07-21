// web/src/pages/api/auth/signup.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  id: string;
  email: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Missing or invalid email/password" });
  }

  try {
    const hashedPassword = await hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });
    return res.status(201).json({ id: user.id, email: user.email });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return res
      .status(400)
      .json({ error: "User may already exist: " + message });
  }
}
