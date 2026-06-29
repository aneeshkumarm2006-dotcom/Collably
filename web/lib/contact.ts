/**
 * Contact form schema — shared by the client form (inline validation) and the
 * `/api/contact` route handler (server-side validation). Framework-neutral.
 */
import { z } from 'zod';

export const CONTACT_TOPICS = ['General', 'For businesses', 'For creators', 'Press', 'Support'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  topic: z.enum(CONTACT_TOPICS).default('General'),
  message: z
    .string()
    .trim()
    .min(10, 'Please add a few more details (10+ characters)')
    .max(4000, 'Message is too long'),
});

export type ContactValues = z.infer<typeof contactSchema>;
