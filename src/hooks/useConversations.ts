import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadLocalConversations,
  saveLocalConversations,
  loadCloudConversations,
  saveConversationCloud,
  deleteConversationCloud,
  migrateLocalToCloud,
} from '../services/storageService';
import { isSupabaseConfigured } from '../services/authService';
import { AppSettings, AuthState, Conversation, User } from '../types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function createConversation(settings: AppSettings): Conversation {
  return {
    id: generateId(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    model: settings.model,
    systemPrompt: settings.systemPrompt,
  };
}

type UseConversationsArgs = {
  user: User | null;
  authState: AuthState;
};

export function useConversations({ user, authState }: UseConversationsArgs) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [migrationNote, setMigrationNote] = useState<string | null>(null);
  const migratedUserRef = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    if (!isSupabaseConfigured) {
      setConversations(loadLocalConversations());
      return;
    }

    const run = async () => {
      if (authState === 'authenticated' && user) {
        setShowSavePrompt(false);

        if (window.location.search || window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (migratedUserRef.current !== user.id) {
          const count = await migrateLocalToCloud(user.id);
          if (!isCancelled && count > 0) {
            setMigrationNote(`${count} conversation${count > 1 ? 's' : ''} saved to your account!`);
          }
          migratedUserRef.current = user.id;
        }

        const cloud = await loadCloudConversations(user.id);
        if (!isCancelled) {
          setConversations(cloud);
        }
        return;
      }

      if (authState === 'guest') {
        migratedUserRef.current = null;
        setConversations(loadLocalConversations());
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [authState, user]);

  useEffect(() => {
    if (authState === 'guest') {
      saveLocalConversations(conversations);
    }
  }, [authState, conversations]);

  useEffect(() => {
    if (authState !== 'guest') {
      return;
    }

    const key = 'ai-studio-save-prompt-dismissed';
    if (localStorage.getItem(key)) {
      return;
    }

    const hasMessages = conversations.some((conversation) => conversation.messages.length >= 2);
    if (hasMessages) {
      setShowSavePrompt(true);
    }
  }, [authState, conversations]);

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.id === activeId) || null;
  }, [conversations, activeId]);

  const newConversation = useCallback(
    (settings: AppSettings) => {
      const conversation = createConversation(settings);
      setConversations((previous) => [...previous, conversation]);
      setActiveId(conversation.id);

      if (user) {
        setIsSyncing(true);
        saveConversationCloud(conversation, user.id).finally(() => setIsSyncing(false));
      }

      return conversation.id;
    },
    [user],
  );

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((previous) => previous.filter((conversation) => conversation.id !== id));
      setActiveId((previous) => (previous !== id ? previous : null));
      if (user) {
        void deleteConversationCloud(id);
      }
    },
    [user],
  );

  const dismissSavePrompt = useCallback(() => {
    setShowSavePrompt(false);
    localStorage.setItem('ai-studio-save-prompt-dismissed', '1');
  }, []);

  const clearMigrationNote = useCallback(() => {
    setMigrationNote(null);
  }, []);

  return {
    conversations,
    setConversations,
    activeId,
    setActiveId,
    activeConversation,
    isSyncing,
    setIsSyncing,
    showSavePrompt,
    setShowSavePrompt,
    dismissSavePrompt,
    migrationNote,
    clearMigrationNote,
    newConversation,
    selectConversation,
    deleteConversation,
  };
}
