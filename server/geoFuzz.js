import { createHash } from 'node:crypto';

// How far a displayed pin can be offset from someone's real location.
// Small enough to still feel "in the neighborhood" for a 30-mile-radius
// app, large enough to not pinpoint a specific building/home.
const FUZZ_RADIUS_MILES = 0.4;
const MILES_PER_DEGREE_LAT = 69.0;

// Deterministically offsets a user's real coordinates by a random amount
// within FUZZ_RADIUS_MILES, in a random direction — never send another
// user's exact lat/lng to a client, only this.
//
// The offset is derived from a hash of (userId, today's UTC date), so it's
// stable across repeated requests within the same day (a map marker that
// jitters to a new random spot on every 15s poll would look broken) and
// changes daily (so a fixed offset can't be learned and subtracted back
// out over time). Critically, it's NOT re-randomized per request — an
// offset that changes every call would average out to the real position
// given enough samples, defeating the whole point.
export const fuzzLocation = (userId, lat, lng) => {
  const daySeed = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const hash = createHash('sha256').update(`${userId}:${daySeed}`).digest();

  const r1 = hash.readUInt32BE(0) / 0xffffffff;
  const r2 = hash.readUInt32BE(4) / 0xffffffff;

  const radiusMiles = FUZZ_RADIUS_MILES * Math.sqrt(r1); // uniform over a disk, not just the edge
  const angle = r2 * 2 * Math.PI;

  const latRad = (lat * Math.PI) / 180;
  const milesPerDegreeLng = MILES_PER_DEGREE_LAT * Math.cos(latRad);

  const deltaLat = (radiusMiles * Math.cos(angle)) / MILES_PER_DEGREE_LAT;
  const deltaLng = milesPerDegreeLng > 0 ? (radiusMiles * Math.sin(angle)) / milesPerDegreeLng : 0;

  return { lat: lat + deltaLat, lng: lng + deltaLng };
};
