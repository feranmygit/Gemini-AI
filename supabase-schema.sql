-- Run this in your Supabase project → SQL Editor
-- supabase.com/dashboard → your project → SQL Editor → New query → paste → Run

-- Enable Row Level Security
create extension if not exists "uuid-ossp";

-- ── Conversations ──────────────────────────────────────────────────────────────
create table if not exists conversations (
  id           text primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null default 'New Conversation',
  model        text not null default 'gemini-2.5-flash',
  system_prompt text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table conversations enable row level security;

create policy "Users can only access their own conversations"
  on conversations for all
  using (auth.uid() = user_id);

-- ── Messages ───────────────────────────────────────────────────────────────────
create table if not exists messages (
  id                text primary key,
  conversation_id   text references conversations(id) on delete cascade not null,
  role              text not null check (role in ('user', 'assistant')),
  content           text not null default '',
  attachments       jsonb,
  generated_images  jsonb,
  created_at        timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Users can only access messages in their conversations"
  on messages for all
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

-- ── Indexes ────────────────────────────────────────────────────────────────────
create index if not exists idx_conversations_user_id on conversations(user_id);
create index if not exists idx_conversations_updated_at on conversations(updated_at desc);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_created_at on messages(created_at);

-- Done! Your database is ready.
