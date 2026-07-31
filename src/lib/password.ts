// Local password feedback for the sign-up form.
//
// This is a hint, not the rule. Clerk decides server-side and scores how
// *guessable* a password is (zxcvbn plus breach lists), so "test1234@D" is
// rejected even though it has length, mixed case, a digit and a symbol. A
// meter that counted only those four things called that password "Strong" and
// then the server refused it — worse than no meter, because the user followed
// it and still got blocked.
//
// Matching Clerk exactly would mean bundling zxcvbn (~400KB with a dictionary)
// into the app. Instead this caps the score for the patterns that cause almost
// all real rejections, and says why. It can under-promise; it should never
// over-promise.

// A common word only counts when it is not part of a longer word: "test1234"
// is caught, "protest" is not. Digits are word characters, so \b cannot do
// this — hence the explicit "not a letter" edges.
const WEAK_WORD =
  /(?:^|[^a-z])(pass|passwd|password|qwerty|asdf|asdfgh|letmein|admin|welcome|test|testing|triply|iloveyou|dragon|monkey|secret|hello|login)(?:[^a-z]|$)/i;

// Runs along a keyboard row or the alphabet, which zxcvbn scores as nearly free
// to guess. Built from the rows rather than written out by hand: a hand-typed
// list kept missing cases (reverse runs like "9876", the bottom row "zxcv"),
// and this covers every four-character window in both directions.
const KEYBOARD_ROWS = [
  // Both digit orders: the keyboard row ends "...7890", while counting starts
  // "0123...". Neither alone catches both "7890" and "0123".
  "1234567890",
  "0123456789",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "abcdefghijklmnopqrstuvwxyz",
];
const WEAK_SEQUENCE = new RegExp(
  KEYBOARD_ROWS.flatMap((row) => {
    const runs: string[] = [];
    for (let i = 0; i + 4 <= row.length; i++) {
      const run = row.slice(i, i + 4);
      runs.push(run, [...run].reverse().join(""));
    }
    return runs;
  }).join("|"),
  "i",
);

// Note: runs of one repeated character ("0000") are left to REPEATED_RUN below,
// which catches them generally.

// The same character four or more times in a row ("aaaa", "!!!!").
const REPEATED_RUN = /(.)\1{3,}/;

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;

export type PasswordStrength = {
  /** 0–4, matching the four segments of the meter. */
  score: number;
  label: string;
  /** Set when the score was capped — tells the user what to change. */
  hint?: string;
};

/**
 * @param pw       the password being typed
 * @param personal name and email of the person signing up, so the meter can
 *                 refuse a password built from their own details (Clerk does
 *                 the same, and it is the second most common rejection)
 */
export function passwordStrength(
  pw: string,
  personal: string[] = [],
): PasswordStrength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;

  // Below the minimum length nothing else earns credit. Without this, a digit
  // and a symbol were enough for a 7-character password to read "Fair", and
  // the "Too short" label was unreachable.
  if (pw.length < 8) return { score: 0, label: LABELS[0] };

  let hint: string | undefined;

  // Capped to "Weak" rather than a middling score: Clerk will refuse these
  // outright, so anything friendlier would still be a false promise.
  if (WEAK_WORD.test(pw) || WEAK_SEQUENCE.test(pw) || REPEATED_RUN.test(pw)) {
    score = Math.min(score, 1);
    hint = "Avoid common words and runs like “test”, “1234” or “aaaa”.";
  }

  const lower = pw.toLowerCase();
  const ownWords = personal
    // An email's domain is not a personal detail. Keeping it would flag any
    // password containing "gmail", and — now that three-letter fragments count
    // — every password containing "com" ("become", "welcome") as if it held
    // the user's own name.
    .map((p) => p.split("@")[0])
    .flatMap((p) => p.toLowerCase().split(/[\s._-]+/))
    // Three is the shortest real given name ("Ava", "Lee"); two would match
    // far too much.
    .filter((p) => p.length >= 3);
  if (ownWords.some((w) => lower.includes(w))) {
    score = Math.min(score, 1);
    hint = "Avoid your own name or email address in the password.";
  }

  return { score, label: LABELS[score], hint };
}
