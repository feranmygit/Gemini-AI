import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Conversation, Message } from '../types';

// ─── Local (guest) storage ────────────────────────────────────────────────────

const LOCAL_KEY = 'ai-studio-conversations';

export function loadLocalConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((c: Conversation) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messages: c.messages.map((m: Message) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

export function saveLocalConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(conversations));
  } catch { /* quota exceeded — ignore */ }
}

export function clearLocalConversations(): void {
  localStorage.removeItem(LOCAL_KEY);
}

// ─── Cloud (Supabase) storage ─────────────────────────────────────────────────

export async function loadCloudConversations(userId: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured) return [];
  const { data: convRows, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (convErr) { console.error('loadCloudConversations:', convErr); return []; }
  if (!convRows?.length) return [];

  const convIds = convRows.map((c: { id: string }) => c.id);
  const { data: msgRows, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: true });

  if (msgErr) { console.error('loadCloudMessages:', msgErr); }

  const msgsByConv: Record<string, Message[]> = {};
  for (const row of (msgRows ?? [])) {
    if (!msgsByConv[row.conversation_id]) msgsByConv[row.conversation_id] = [];
    msgsByConv[row.conversation_id].push({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: new Date(row.created_at),
      attachments: row.attachments ?? undefined,
      generatedImages: row.generated_images ?? undefined,
    });
  }

  return convRows.map((row: {
    id: string; title: string; model: string;
    system_prompt: string; created_at: string; updated_at: string;
  }) => ({
    id: row.id,
    title: row.title,
    model: row.model,
    systemPrompt: row.system_prompt,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    messages: msgsByConv[row.id] ?? [],
  }));
}

export async function saveConversationCloud(conv: Conversation, userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('conversations').upsert({
    id: conv.id,
    user_id: userId,
    title: conv.title,
    model: conv.model,
    system_prompt: conv.systemPrompt,
    created_at: conv.createdAt.toISOString(),
    updated_at: conv.updatedAt.toISOString(),
  });
}

export async function saveMessageCloud(msg: Message, conversationId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('messages').upsert({
    id: msg.id,
    conversation_id: conversationId,
    role: msg.role,
    content: msg.content,
    attachments: msg.attachments ?? null,
    generated_images: msg.generatedImages ?? null,
    created_at: msg.timestamp.toISOString(),
  });
}

export async function deleteConversationCloud(convId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('messages').delete().eq('conversation_id', convId);
  await supabase.from('conversations').delete().eq('id', convId);
}

export async function updateConversationTitleCloud(convId: string, title: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', convId);
}

// ─── Migration: move guest chats into cloud after sign-in ─────────────────────

export async function migrateLocalToCloud(userId: string): Promise<number> {
  const local = loadLocalConversations();
  if (!local.length) return 0;

  for (const conv of local) {
    await saveConversationCloud(conv, userId);
    for (const msg of conv.messages) {
      await saveMessageCloud(msg, conv.id);
    }
  }
  clearLocalConversations();
  return local.length;
}
