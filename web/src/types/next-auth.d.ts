// web/src/types/next-auth.d.ts

import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      /** The user's database ID */
      id: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    /** The user's database ID */
    id: string;
  }
}

// No imports needed here—this simply augments the JWT payload type
declare module "next-auth/jwt" {
  interface JWT {
    /** The user's database ID, stored in the token */
    sub?: string;
  }
}
