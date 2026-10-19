const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 12;
// Largest multiple of the alphabet size that fits in a byte; larger bytes are skipped so every
// character is equally likely.
const UNBIASED_LIMIT = 256 - (256 % ALPHABET.length);

/**
 * A new job ID: lowercase letters and digits only, so it can never start with a formula character
 * and needs no escaping. Random rather than derived from the job, because the same posting can be
 * saved from different sources and the ID must stay stable across edits.
 */
export function newJobId(): string {
  let id = "";
  while (id.length < ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(ID_LENGTH))) {
      if (byte < UNBIASED_LIMIT && id.length < ID_LENGTH) id += ALPHABET.charAt(byte % ALPHABET.length);
    }
  }
  return id;
}
