# test login credentials

Created by `npm run db:seed`. These are for testing only — change or delete
them (or just create real accounts and delete these) before sending the
site to anyone else. Passwords are intentionally simple test values, not
meant to be secure long-term.

## quick reference (one of each role)

| role | email | password |
| --- | --- | --- |
| admin | `admin1@hoa.test` | `Admin123!` |
| owner | `owner1@hoa.test` | `Owner123!` |
| renter | `renter1@hoa.test` | `Renter123!` |

## full list (10 seeded profiles)

| email | password | role(s) | notes |
| --- | --- | --- | --- |
| admin1@hoa.test | Admin123! | admin | admin-only account |
| admin2@hoa.test | Admin123! | admin, renter | demonstrates one person holding two role tags at once |
| owner1@hoa.test | Owner123! | owner | |
| owner2@hoa.test | Owner123! | owner | |
| owner3@hoa.test | Owner123! | owner | |
| owner4@hoa.test | Owner123! | owner | |
| renter1@hoa.test | Renter123! | renter | |
| renter2@hoa.test | Renter123! | renter | |
| renter3@hoa.test | Renter123! | renter | |
| renter4@hoa.test | Renter123! | renter | |

To create more accounts (real or test), sign in as an admin and use
**create profile** at `/portal/admin/users` — that's the "capability to
create profiles" you asked for.
