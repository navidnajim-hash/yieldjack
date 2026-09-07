/**
 * Deterministic, non-cryptographic 32-bit FNV-1a hash, used only to compare a candidate address
 * against `KNOWN_DEMO_OR_FORBIDDEN_ADDRESS_HASHES` without ever holding the literal demo/mock
 * addresses (or the canonical mainnet USDG address) as string constants in this app's source —
 * see the note in `knownDemoAddresses.ts` for why that matters for the production build-output
 * safety scan. This is a collision-resistance-for-a-small-known-set tool, not a security
 * boundary: the primary address validation is `sanitizeAddress`'s shape/zero-address checks.
 */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
