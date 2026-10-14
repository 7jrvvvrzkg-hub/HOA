import type { RoleTag } from "@/db/schema";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    signedAt?: number;
    user: {
      id: string;
      roles: RoleTag[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    roles: RoleTag[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: RoleTag[];
    signedAt?: number;
  }
}
