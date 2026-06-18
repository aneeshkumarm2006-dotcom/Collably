/**
 * Geocoding routes (On-Site Location feature). A thin, authenticated proxy in
 * front of `services/geocoding` so the Google Geocoding key stays server-side.
 * The campaign form (Step 3) uses these to turn a typed address into a map pin
 * and a dragged pin back into an address.
 *
 *   GET /api/geocoding/status                 → { configured }
 *   GET /api/geocoding/search?q=...           → { configured, result|null }
 *   GET /api/geocoding/reverse?lat=&lng=      → { configured, result|null }
 *
 * Every response carries `configured` so the client can show "address search
 * coming soon" without a separate probe. When the key is unset the routes return
 * 200 with `configured: false` (not an error) — the client just falls back to the
 * manually-dragged pin.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../lib/utils';
import { isGeocodingConfigured, forwardGeocode, reverseGeocode } from '../services';

const router = Router();

const searchSchema = z.object({
  q: z.string().trim().min(1, 'a query is required').max(300),
});

const reverseSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/** GET /api/geocoding/status — whether typed-address geocoding is available. */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (_req, res) => {
    res.status(200).json({ configured: isGeocodingConfigured() });
  }),
);

/** GET /api/geocoding/search — forward geocode a typed address → best-match pin. */
router.get(
  '/search',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q } = searchSchema.parse(req.query);
    const result = await forwardGeocode(q);
    res.status(200).json({ configured: isGeocodingConfigured(), result });
  }),
);

/** GET /api/geocoding/reverse — reverse geocode a dragged pin → formatted address. */
router.get(
  '/reverse',
  authenticate,
  asyncHandler(async (req, res) => {
    const { lat, lng } = reverseSchema.parse(req.query);
    const result = await reverseGeocode(lat, lng);
    res.status(200).json({ configured: isGeocodingConfigured(), result });
  }),
);

export default router;
