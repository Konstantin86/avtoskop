// Offer photo rules, in one place for the form, the upload route and the cleanup job.
export const PHOTO_LIMITS = {
  perOffer: 10,
  maxUploadBytes: 15 * 1024 * 1024,
  // Unattached uploads a seller may hold at once, so nobody fills the disk.
  maxPendingPerSeller: 30,
  // Stored sizes: the long side of the full photo and of the preview, in pixels.
  fullSide: 1600,
  thumbSide: 480,
  // Photos never attached to an offer, and photos of offers on closed requests, are removed.
  unattachedHours: 24,
  closedRequestDays: 90,
} as const;

// Stored files are named <key>.webp and <key>-s.webp; keys are 32 random hex characters.
export const PHOTO_KEY = /^[0-9a-f]{32}$/;

export function photoFileNames(key: string): { full: string; thumb: string } {
  return { full: `${key}.webp`, thumb: `${key}-s.webp` };
}
