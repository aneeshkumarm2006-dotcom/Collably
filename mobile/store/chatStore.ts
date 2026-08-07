/**
 * Chat store (Zustand). Holds the caller's conversations, per-thread message
 * lists, and the total unread count that drives the Messages-tab badge.
 *
 * Messages are kept **newest-first** so an inverted `FlatList` renders them with
 * the latest at the bottom and pages older history by appending. Sends are
 * optimistic; the REST round-trip + the Socket.io `message:new` echo reconcile by
 * `_id`. Real-time updates arrive via {@link useChatSocket} which calls
 * `onMessageNew` / `onConversationRead`.
 */
import { create } from 'zustand';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Conversation, Message } from '@/types';

const totalUnreadOf = (convos: Conversation[]): number =>
  convos.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

/** Insert or replace a message in a newest-first list (dedupe by `_id`). */
function upsertNewest(list: Message[], msg: Message): Message[] {
  const idx = list.findIndex((m) => m._id === msg._id);
  if (idx >= 0) {
    const next = list.slice();
    next[idx] = msg;
    return next;
  }
  return [msg, ...list];
}

/** Merge two newest-first pages, dropping duplicates by `_id`. */
function mergeNewest(existing: Message[], older: Message[]): Message[] {
  const seen = new Set(existing.map((m) => m._id));
  return [...existing, ...older.filter((m) => !seen.has(m._id))];
}

type ChatState = {
  conversations: Conversation[];
  /** conversationId → messages (newest-first). */
  messages: Record<string, Message[]>;
  /**
   * conversationId → unsent composer text. Lives here rather than in the composer's
   * own `useState` so leaving a thread and coming back doesn't throw the draft away
   * (the thread screen unmounts on navigation, the store doesn't). Kept in memory
   * only: drafts are worth surviving navigation, not worth an encrypted write on
   * every keystroke.
   */
  drafts: Record<string, string>;
  totalUnread: number;
  loadingConversations: boolean;

  /** Save (or clear, when empty) the unsent text for one thread. */
  setDraft: (conversationId: string, text: string) => void;

  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string, before?: string) => Promise<Message[]>;
  /** Send a text message, an image message, or an image with a caption. */
  sendMessage: (
    conversationId: string,
    payload: { body?: string; imageUrl?: string },
  ) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;

  // Socket-driven.
  onMessageNew: (conversationId: string, message: Message) => void;
  onConversationRead: (conversationId: string) => void;
  onConversationDelivered: (conversationId: string) => void;

  reset: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  drafts: {},
  totalUnread: 0,
  loadingConversations: false,

  setDraft: (conversationId, text) =>
    set((s) => {
      // Drop the key entirely when the draft is emptied, so `drafts[id]` stays a
      // truthy check for "this thread has something unsent".
      if (!text) {
        if (s.drafts[conversationId] === undefined) return s;
        const { [conversationId]: _removed, ...rest } = s.drafts;
        return { drafts: rest };
      }
      if (s.drafts[conversationId] === text) return s;
      return { drafts: { ...s.drafts, [conversationId]: text } };
    }),

  loadConversations: async () => {
    set({ loadingConversations: true });
    try {
      const { data } = await api.get<{ data: Conversation[] }>('/conversations', {
        params: { limit: 50 },
      });
      set({
        conversations: data.data,
        totalUnread: totalUnreadOf(data.data),
        loadingConversations: false,
      });
    } catch {
      set({ loadingConversations: false });
    }
  },

  loadMessages: async (conversationId, before) => {
    const { data } = await api.get<{ messages: Message[] }>(
      `/conversations/${conversationId}/messages`,
      { params: { limit: 30, ...(before ? { before } : {}) } },
    );
    set((s) => {
      const existing = s.messages[conversationId] ?? [];
      const next = before ? mergeNewest(existing, data.messages) : data.messages;
      return { messages: { ...s.messages, [conversationId]: next } };
    });
    return data.messages;
  },

  sendMessage: async (conversationId, payload) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const body = payload.body?.trim() ?? '';
    const imageUrl = payload.imageUrl;
    // Guard: never fire an empty POST (the server rejects it anyway).
    if (!body && !imageUrl) return;
    const tempId = `temp-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const optimistic: Message = {
      _id: tempId,
      conversationId,
      senderUserId: me._id,
      senderRole: me.role,
      body,
      ...(imageUrl ? { imageUrl } : {}),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [optimistic, ...(s.messages[conversationId] ?? [])],
      },
    }));
    // The text is in flight now, so it's no longer a draft. Stashed so a failed
    // send can hand it back rather than losing what the user typed.
    const priorDraft = get().drafts[conversationId];
    get().setDraft(conversationId, '');

    try {
      const { data } = await api.post<{ message: Message }>(
        `/conversations/${conversationId}/messages`,
        { ...(body ? { body } : {}), ...(imageUrl ? { imageUrl } : {}) },
      );
      set((s) => {
        const withoutTemp = (s.messages[conversationId] ?? []).filter((m) => m._id !== tempId);
        return {
          messages: { ...s.messages, [conversationId]: upsertNewest(withoutTemp, data.message) },
        };
      });
      get().onMessageNew(conversationId, data.message);
    } catch (err) {
      // Roll back the optimistic bubble so the user can retry.
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: (s.messages[conversationId] ?? []).filter((m) => m._id !== tempId),
        },
      }));
      // Put the text back in the composer — losing it on a flaky network is worse
      // than the failed send itself.
      if (priorDraft !== undefined) get().setDraft(conversationId, priorDraft);
      throw err;
    }
  },

  markRead: async (conversationId) => {
    // Optimistically zero this thread's unread, then sync.
    set((s) => {
      const conversations = s.conversations.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c,
      );
      return { conversations, totalUnread: totalUnreadOf(conversations) };
    });
    try {
      await api.post(`/conversations/${conversationId}/read`);
    } catch {
      // Non-fatal — the next loadConversations will reconcile.
    }
  },

  onMessageNew: (conversationId, message) => {
    const myId = useAuthStore.getState().user?._id;
    const fromOther = !!myId && message.senderUserId !== myId;

    set((s) => {
      const list = s.messages[conversationId] ?? [];
      const messages = { ...s.messages, [conversationId]: upsertNewest(list, message) };

      const idx = s.conversations.findIndex((c) => c._id === conversationId);
      if (idx < 0) {
        // Unknown conversation (e.g. just created) — pull the list fresh.
        void get().loadConversations();
        return { messages };
      }

      const current = s.conversations[idx];
      // An image-only message previews as "Photo" (mirrors the server + admin chat).
      const preview = message.body?.trim() ? message.body : message.imageUrl ? 'Photo' : '';
      const delivered = !!(message.deliveredAt || message.readAt);
      const updated: Conversation = {
        ...current,
        lastMessage: preview,
        lastMessageAt: message.createdAt,
        lastSenderUserId: message.senderUserId,
        unreadCount: fromOther ? (current.unreadCount ?? 0) + 1 : current.unreadCount,
        // Reset the list tick to match THIS new last message: single ✓ until it's
        // delivered. When it's the other party's message the tick is hidden anyway.
        lastMessageDelivered: fromOther ? current.lastMessageDelivered : delivered,
        ...(fromOther ? {} : { lastReadByOther: false }),
      };
      // Move the touched thread to the top.
      const conversations = [updated, ...s.conversations.filter((_, i) => i !== idx)];
      return { messages, conversations, totalUnread: totalUnreadOf(conversations) };
    });
  },

  onConversationRead: (conversationId) => {
    const myId = useAuthStore.getState().user?._id;
    if (!myId) return;
    // The other participant read the thread — stamp our sent messages as read, and
    // flip the list row's read receipt to blue (delivered implied by read).
    set((s) => {
      const list = s.messages[conversationId];
      const conversations = s.conversations.map((c) =>
        c._id === conversationId ? { ...c, lastReadByOther: true, lastMessageDelivered: true } : c,
      );
      if (!list) return { conversations };
      const now = new Date().toISOString();
      const next = list.map((m) =>
        m.senderUserId === myId && !m.readAt ? { ...m, readAt: now } : m,
      );
      return { conversations, messages: { ...s.messages, [conversationId]: next } };
    });
  },

  onConversationDelivered: (conversationId) => {
    const myId = useAuthStore.getState().user?._id;
    if (!myId) return;
    // The recipient came online — stamp our undelivered sent messages as delivered,
    // and flip the list row's tick to grey ✓✓ (delivered, not yet read).
    set((s) => {
      const list = s.messages[conversationId];
      const conversations = s.conversations.map((c) =>
        c._id === conversationId ? { ...c, lastMessageDelivered: true } : c,
      );
      if (!list) return { conversations };
      const now = new Date().toISOString();
      const next = list.map((m) =>
        m.senderUserId === myId && !m.deliveredAt && !m.readAt ? { ...m, deliveredAt: now } : m,
      );
      return { conversations, messages: { ...s.messages, [conversationId]: next } };
    });
  },

  reset: () =>
    set({ conversations: [], messages: {}, drafts: {}, totalUnread: 0, loadingConversations: false }),
}));
