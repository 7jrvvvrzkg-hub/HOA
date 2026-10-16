import type { RoleTag } from "@/db/schema";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    signedAt?: number;
    sid?: string;
    user: {
      id: string;
      roles: RoleTag[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    sid?: string;
    roles: RoleTag[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: RoleTag[];
    signedAt?: number;
    sid?: string;
  }
}
