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

// Keyboard walks and digit runs, which zxcvbn scores as nearly free to guess.
const WEAK_SEQUENCE = /1234|2345|3456|4567|5678|6789|7890|0000|1111|abcd|qwer/i;

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
    .flatMap((p) => p.toLowerCase().split(/[\s@._-]+/))
    // Short fragments ("li", "co") would match far too much.
    .filter((p) => p.length >= 4);
  if (ownWords.some((w) => lower.includes(w))) {
    score = Math.min(score, 1);
    hint = "Avoid your own name or email address in the password.";
  }

  return { score, label: LABELS[score], hint };
}
