import { adminGet } from '@/lib/backend';
import type { AdminConversation } from '@/lib/types';
import { InboxClient } from '@/components/InboxClient';
import { PageHeader, ErrorBox, EmptyBox } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  let rows: AdminConversation[] = [];
  let error: string | null = null;
  try {
    const res = await adminGet<{ data: AdminConversation[] }>('/conversations');
    rows = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] min-h-[460px] flex-col">
      <PageHeader
        title="Messages"
        subtitle="Support inbox for creator and business conversations, newest activity first."
        count={error ? undefined : rows.length}
      />
      {error ? (
        <ErrorBox message={error} />
      ) : rows.length === 0 ? (
        <EmptyBox label="No conversations yet." />
      ) : (
        <div className="min-h-0 flex-1">
          <InboxClient conversations={rows} />
        </div>
      )}
    </div>
  );
}
