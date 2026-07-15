/**
 * Public webhook endpoints (no auth — the caller is the third party, verified by
 * signature). Currently just Meta's Instagram messaging webhook, which powers the
 * DM-code verification flow.
 *
 *   GET  /api/webhooks/instagram   Meta subscription challenge (echo hub.challenge)
 *   POST /api/webhooks/instagram   inbound DM events (signature-checked)
 */
import { Router, type Request } from 'express';
import { asyncHandler } from '../lib/utils';
import { env } from '../lib/env';
import { verifyWebhookSignature, getInstagramProfile } from '../services';
import { handleInstagramDm } from '../lib/instagramVerify';

const router = Router();

/** Meta's one-time subscription handshake: echo the challenge when the token matches. */
router.get(
  '/instagram',
  asyncHandler(async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === env.instagram.webhookVerifyToken) {
      res.status(200).send(String(challenge ?? ''));
      return;
    }
    res.sendStatus(403);
  }),
);

/**
 * Inbound DM events. Meta signs the body with the app secret; we verify that before
 * trusting anything. For each text DM, read the sender's profile and run it through
 * the shared handler (which matches it to a pending verification session).
 *
 * Always 200s once the signature checks out — Meta retries non-2xx, and the work is
 * best-effort per event.
 */
router.post(
  '/instagram',
  asyncHandler(async (req, res) => {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!raw || !verifyWebhookSignature(raw, req.header('x-hub-signature-256'))) {
      res.sendStatus(403);
      return;
    }

    const body = req.body as {
      entry?: { messaging?: { sender?: { id?: string }; message?: { text?: string } }[] }[];
    };

    for (const entry of body.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        const igsid = event.sender?.id;
        // Only inbound text DMs matter here; ignore echoes, reactions, etc.
        if (!igsid || typeof event.message?.text !== 'string') continue;
        const profile = await getInstagramProfile(igsid);
        if (profile) await handleInstagramDm(igsid, profile);
      }
    }

    res.sendStatus(200);
  }),
);

export default router;
