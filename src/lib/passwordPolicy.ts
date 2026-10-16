// One password rule for the whole site (creating accounts, changing a
// password, resetting one). Length is what actually matters, so that's the
// main requirement, plus a block on the passwords attackers try first.

export const MIN_PASSWORD_LENGTH = 12;
// bcrypt only reads the first 72 bytes, so longer ones are refused rather
// than silently shortened.
export const MAX_PASSWORD_BYTES = 72;

const COMMON = new Set(
  [
    "password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword",
    "123456789012", "1234567890123", "qwertyuiop12", "qwertyuiopasdf", "qwerty123456", "qwertyuiop123",
    "iloveyou1234", "letmein12345", "welcome12345", "welcome1234!", "administrator", "admin1234567", "admin123456!",
    "changeme1234", "changemenow", "tazewellplace", "tazewell1234", "tazewellplace1", "tazewellplace123",
    "owner1234567", "renter1234567", "director1234", "abcdefghijkl", "abcd12345678", "000000000000", "111111111111",
    "123123123123", "monkey123456", "dragon123456", "football1234", "baseball1234", "trustno11234", "sunshine1234",
    "princess1234", "superman1234", "master123456", "shadow123456", "norfolk12345", "virginia1234", "condo1234567",
  ].map((s) => s.toLowerCase())
);

/** Returns a plain-English problem with the password, or null if it's fine. */
export function passwordProblem(password: string, context?: { email?: string; name?: string }): string | null {
  if (typeof password !== "string") return "enter a password";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters — a few random words strung together works well`;
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) return "password is too long (72 characters at most)";
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "that password is too common — pick something less guessable";
  if (/^(.)\1+$/.test(password)) return "that password is too repetitive";
  if (/^(0123456789|1234567890|abcdefghij|qwertyuiop)/i.test(password) && new Set(lower).size < 12) {
    return "that password is too easy to guess";
  }
  const local = context?.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "password shouldn't contain the email address";
  const first = context?.name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (first && first.length >= 4 && lower === first) return "password shouldn't just be a name";
  return null;
}
