import { describe, expect, it } from 'vitest';
import { contactSchema, CONTACT_TOPICS } from '@/lib/contact';

const valid = {
  name: 'Maya Bennett',
  email: 'maya@example.com',
  topic: 'Support' as const,
  message: 'I would like to learn more about partnering.',
};

describe('contactSchema', () => {
  it('accepts a fully-specified valid submission', () => {
    const r = contactSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.topic).toBe('Support');
  });

  it("defaults the topic to 'General' when omitted", () => {
    const { topic: _omit, ...withoutTopic } = valid;
    const r = contactSchema.safeParse(withoutTopic);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.topic).toBe('General');
  });

  it('accepts every declared topic value', () => {
    for (const topic of CONTACT_TOPICS) {
      expect(contactSchema.safeParse({ ...valid, topic }).success).toBe(true);
    }
  });

  it('rejects an invalid topic', () => {
    const r = contactSchema.safeParse({ ...valid, topic: 'Random' });
    expect(r.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const r = contactSchema.safeParse({ ...valid, name: '   ' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Name is required');
  });

  it('rejects a malformed email', () => {
    const r = contactSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Enter a valid email');
  });

  it('rejects a message shorter than 10 characters', () => {
    const r = contactSchema.safeParse({ ...valid, message: 'too short' }); // 9 chars
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues[0].message).toBe('Please add a few more details (10+ characters)');
  });

  it('accepts a message at the 10-character boundary', () => {
    const r = contactSchema.safeParse({ ...valid, message: '1234567890' });
    expect(r.success).toBe(true);
  });
});
