import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(1, "name (full name) is required").max(200),
  email: z.string().email("please enter a valid email"),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().min(1, "message is required").max(4000),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(1).max(200),
  unit: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  shareUnit: z.boolean(),
  sharePhone: z.boolean(),
  shareContactEmail: z.boolean(),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  pinned: z.boolean(),
  active: z.boolean(),
  audience: z.enum(["ALL_RESIDENTS", "OWNERS_ONLY", "RENTERS_ONLY", "ADMIN_ONLY"]),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "password (temporary password) must be at least 8 characters"),
  fullName: z.string().min(1).max(200),
  roles: z.array(z.enum(["ADMIN", "OWNER", "RENTER"])).min(1),
  unit: z.string().max(100).optional().or(z.literal("")),
});
