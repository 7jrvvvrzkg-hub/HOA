/**
 * Seeds ~10 test profiles so val can click through every role before
 * sending this off. See CREDENTIALS.md for the full login list — the
 * admin1/owner1/renter1 accounts below are the ones meant for quick manual
 * testing.
 *
 * Run with: npm run db:seed  (after DATABASE_URL is set and the schema has
 * been pushed with npm run db:push)
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, residentProfiles, adminAccounts, announcements } from "./schema";

const TEST_PASSWORD_ADMIN = "Admin123!";
const TEST_PASSWORD_OWNER = "Owner123!";
const TEST_PASSWORD_RENTER = "Renter123!";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function findOrCreateUser(email: string, passwordHash: string, roles: ("ADMIN" | "OWNER" | "RENTER")[]) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return existing;
  const [created] = await db.insert(users).values({ email, passwordHash, roles }).returning();
  return created;
}

async function main() {
  console.log("seeding place holder (hoa name) test data...");

  const adminHash = await hash(TEST_PASSWORD_ADMIN);
  const ownerHash = await hash(TEST_PASSWORD_OWNER);
  const renterHash = await hash(TEST_PASSWORD_RENTER);

  // 1. primary admin (admin only)
  const admin1 = await findOrCreateUser("admin1@hoa.test", adminHash, ["ADMIN"]);
  if (!(await db.query.adminAccounts.findFirst({ where: eq(adminAccounts.userId, admin1.id) }))) {
    await db.insert(adminAccounts).values({ userId: admin1.id, fullName: "place holder (admin 1 name)" });
  }

  // 2. admin who is ALSO a renter — demonstrates a profile carrying two role tags.
  const admin2 = await findOrCreateUser("admin2@hoa.test", adminHash, ["ADMIN", "RENTER"]);
  if (!(await db.query.adminAccounts.findFirst({ where: eq(adminAccounts.userId, admin2.id) }))) {
    await db.insert(adminAccounts).values({ userId: admin2.id, fullName: "place holder (admin 2 name)" });
  }
  if (!(await db.query.residentProfiles.findFirst({ where: eq(residentProfiles.userId, admin2.id) }))) {
    await db.insert(residentProfiles).values({
      userId: admin2.id,
      fullName: "place holder (admin 2 name)",
      unit: "unit place holder (e.g. 4B)",
      phone: "place holder (phone)",
      shareUnit: true,
      portalAccessLevel: "FULL",
    });
  }

  // 3-6. owners
  const owners = [
    { email: "owner1@hoa.test", unit: "unit place holder (e.g. 101)" },
    { email: "owner2@hoa.test", unit: "unit place holder (e.g. 102)" },
    { email: "owner3@hoa.test", unit: "unit place holder (e.g. 205)" },
    { email: "owner4@hoa.test", unit: "unit place holder (e.g. 310)" },
  ];
  for (const [i, o] of owners.entries()) {
    const user = await findOrCreateUser(o.email, ownerHash, ["OWNER"]);
    if (!(await db.query.residentProfiles.findFirst({ where: eq(residentProfiles.userId, user.id) }))) {
      await db.insert(residentProfiles).values({
        userId: user.id,
        fullName: `place holder (owner ${i + 1} name)`,
        unit: o.unit,
        phone: "place holder (phone)",
        shareUnit: i % 2 === 0,
        sharePhone: false,
        portalAccessLevel: "STANDARD",
      });
    }
  }

  // 7-10. renters
  const renters = [
    { email: "renter1@hoa.test", unit: "unit place holder (e.g. 103)" },
    { email: "renter2@hoa.test", unit: "unit place holder (e.g. 104)" },
    { email: "renter3@hoa.test", unit: "unit place holder (e.g. 206)" },
    { email: "renter4@hoa.test", unit: "unit place holder (e.g. 311)" },
  ];
  for (const [i, r] of renters.entries()) {
    const user = await findOrCreateUser(r.email, renterHash, ["RENTER"]);
    if (!(await db.query.residentProfiles.findFirst({ where: eq(residentProfiles.userId, user.id) }))) {
      await db.insert(residentProfiles).values({
        userId: user.id,
        fullName: `place holder (renter ${i + 1} name)`,
        unit: r.unit,
        shareUnit: i % 2 === 1,
        portalAccessLevel: "LIMITED",
      });
    }
  }

  // a couple of sample announcements for the bulletin board
  const existingAnnouncements = await db.query.announcements.findMany();
  if (existingAnnouncements.length === 0) {
    await db.insert(announcements).values([
      {
        title: "place holder (sample urgent announcement title)",
        body: "place holder (sample urgent announcement body)",
        priority: "URGENT",
        pinned: true,
        sortOrder: 0,
        authorId: admin1.id,
      },
      {
        title: "place holder (sample normal announcement title)",
        body: "place holder (sample normal announcement body)",
        priority: "NORMAL",
        sortOrder: 1,
        authorId: admin1.id,
      },
      {
        title: "place holder (sample owners-only announcement title)",
        body: "place holder (sample owners-only announcement body)",
        priority: "IMPORTANT",
        audience: "OWNERS_ONLY",
        sortOrder: 2,
        authorId: admin1.id,
      },
    ]);
  }

  console.log("done. see CREDENTIALS.md for the full login list.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
