/**
 * Font files imported as modules.
 *
 * Metro resolves a `.ttf` import to an asset id that `expo-font` loads, but
 * TypeScript has no idea — `expo/types` declares `.css` and friends and stops
 * there. Without this, importing a font file directly is a compile error, which
 * is the only thing standing between us and the barrel import that bundles all
 * fourteen faces of Plus Jakarta Sans instead of the five we use.
 *
 * `number` is the honest type: Metro's asset registry hands back an opaque
 * numeric handle, not a path.
 */
declare module '*.ttf' {
  const asset: number;
  export default asset;
}

declare module '*.otf' {
  const asset: number;
  export default asset;
}
