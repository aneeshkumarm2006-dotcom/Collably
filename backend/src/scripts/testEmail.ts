/**
 * Prove email delivery actually works end-to-end with the configured transport.
 *
 * Email is the only signup gate now, so "the code is wired" is not enough — a
 * real message has to land in a real inbox. This sends the exact verification
 * template a new user gets.
 *
 *   Usage:  npx ts-node src/scripts/testEmail.ts you@example.com
 *
 * Reads GMAIL_USER/GMAIL_APP_PASSWORD (or RESEND_API_KEY/RESEND_FROM) from
 * backend/.env via dotenv (loaded by lib/env). Secrets never leave your machine.
 */
import { env } from '../lib/env';
import {
  sendEmail,
  verificationCodeEmail,
  isGmailConfigured,
  isResendConfigured,
  isEmailConfigured,
} from '../services';

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to || !to.includes('@')) {
    console.error('Usage: npx ts-node src/scripts/testEmail.ts <recipient@email.com>');
    process.exit(1);
  }

  console.log('Transport check:');
  console.log(`  Gmail configured:  ${isGmailConfigured() ? 'yes' : 'no'}`);
  console.log(`  Resend configured: ${isResendConfigured() ? 'yes' : 'no'}`);
  console.log(`  Active transport:  ${isGmailConfigured() ? 'Gmail' : isResendConfigured() ? 'Resend' : 'NONE'}`);

  if (!isEmailConfigured()) {
    console.error('\n✗ No transport configured. Set GMAIL_USER + GMAIL_APP_PASSWORD in backend/.env and retry.');
    process.exit(1);
  }

  const content = verificationCodeEmail({ name: 'Test', code: '123456', ttlMinutes: env.otpTtlMinutes });
  console.log(`\nSending "${content.subject}" → ${to} ...`);

  const result = await sendEmail({ to, ...content });

  if (result.sent) {
    console.log(`\n✓ SENT (id: ${result.id ?? 'n/a'}). Check the inbox — and the spam folder.`);
    process.exit(0);
  } else {
    console.error(`\n✗ FAILED: ${result.reason}`);
    process.exit(1);
  }
}

void main();
