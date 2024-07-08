// Copyright 2023 Mik Bry
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Conversation,
  LlmUsage,
  Message,
  Preset,
  Provider,
  QueryResponse,
  // QueryResultEntry,
  // QueryResult,
} from '@/types';
// import useDataStorage from '@/hooks/useDataStorage';
import {
  getConversation,
  removeConversation,
  updateOrCreateConversation,
} from '@/utils/data/conversations';
// import { deepCopy } from '@/utils/data';
import { defaultPresets, mergePresets } from '@/utils/data/presets';
import { getMessageContentAsString, mergeMessages } from '@/utils/data/messages';
import { deleteUnusedConversationsDir } from '@/utils/backend/tauri';
import logger from '@/utils/logger';
import { usePresetStore, useProviderStore, useThreadStore } from '@/stores';
import {
  // loadConversationMessages,
  removeConversationMessages,
  // saveConversationMessages,
} from '@/utils/backend/commands';

export type Context = {
  conversations: Array<Conversation>;
  archives: Array<Conversation>;
  providers: Array<Provider>;
  presets: Array<Preset>;
  updateConversations: (newConversations: Conversation[]) => Promise<void>;
  deleteConversation: (
    id: string,
    deleteFiles: boolean,
    cleanup?: (conversation: Conversation, conversations: Conversation[]) => Promise<void>,
  ) => Promise<void>;
  isConversationMessagesLoaded: (id: string) => boolean;
  readConversationMessages: (key: string, defaultValue: Message[]) => Promise<Message[]>;
  getConversationMessages: (id: string | undefined) => Message[];
  filterConversationMessages: (
    id: string | undefined,
    filter: (m: Message) => boolean,
  ) => Message[];
  updateConversationMessages: (id: string | undefined, messages: Message[]) => Promise<void>;
  updateMessagesAndConversation: (
    changedMessages: Message[],
    conversationMessages: Message[],
    partialConversation: Partial<Conversation>,
    selectedConversationId: string,
    selectedConversations?: Conversation[],
  ) => Promise<{
    updatedConversation: Conversation;
    updatedConversations: Conversation[];
    updatedMessages: Message[];
  }>;
  searchConversationMessages: (query: string) => Promise<QueryResponse>;
  setArchives: (newArchives: Conversation[]) => void;
  deleteArchive: (id: string, cleanup?: (id: string) => Promise<void>) => Promise<void>;
  setProviders: (newProviders: Provider[]) => void;
  setPresets: (newPresets: Preset[]) => void;
  usage: LlmUsage | undefined;
  setUsage: (newUsage: LlmUsage | undefined) => void;
};

const initialContext: Context = {
  conversations: [],
  updateConversations: async () => {},
  deleteConversation: async () => {},
  isConversationMessagesLoaded: () => true,
  getConversationMessages: () => [],
  readConversationMessages: async () => [],
  filterConversationMessages: () => [],
  updateConversationMessages: async () => {},
  searchConversationMessages: async () => ({ count: 0, results: [] }),
  updateMessagesAndConversation: async () => ({
    updatedConversation: { id: '', createdAt: 0, updatedAt: 0 } as Conversation,
    updatedConversations: [],
    updatedMessages: [],
  }),
  archives: [],
  setArchives: () => {},
  deleteArchive: async () => {},
  providers: [],
  setProviders: () => {},
  presets: [],
  setPresets: () => {},
  usage: undefined,
  setUsage: () => {},
};

const AppContext = createContext(initialContext);

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<LlmUsage>();
  /* const [conversations, setConversations] = useDataStorage(
    'conversations',
    initialContext.conversations,
  ); */
  const {
    conversations,
    setConversations,
    archives,
    setArchives,
    messages,
    readConversationMessages,
    filterConversationMessages,
    updateConversationMessages,
    searchConversationMessages,
  } = useThreadStore();

  // const [archives, setArchives] = useDataStorage('archives', initialContext.archives);

  // const [providers, setProviders] = useDataStorage('providers', initialContext.providers);
  const { providers, setProviders, loadProviders } = useProviderStore();

  const { presets, setPresets, loadPresets } = usePresetStore();
  // const [presets, setPresets] = useDataStorage('presets', initialContext.presets);

  useEffect(() => {
    if (!providers.find((p) => p.type === 'opla')) {
      if (providers.length === 0) {
        loadProviders();
      }
    }
  }, [providers, loadProviders]);

  useEffect(() => {
    if (presets && !presets?.find((p) => p.id === 'opla')) {
      if (presets.length === 0) {
        loadPresets();
      } else {
        const updatedPresets = mergePresets(presets, defaultPresets);
        setPresets(updatedPresets);
      }
    }
  }, [presets, loadPresets, setPresets]);

  const getConversationMessages = useCallback(
    (id: string | undefined): Message[] => {
      let conversationMessages: Message[] | undefined;
      if (id) {
        conversationMessages = messages[id];
      }
      return conversationMessages || [];
    },
    [messages],
  );

  const isConversationMessagesLoaded = useCallback((id: string) => !!messages[id], [messages]);

  const updateConversations = useCallback(
    async (updatedConversations: Conversation[], needToUpdateMessages = true) => {
      if (needToUpdateMessages) {
        const promises: Promise<void>[] = [];
        const conversationsWithoutMessages: Conversation[] = updatedConversations.map((c) => {
          const { messages: updatedMessages, ...updatedConversation } = c;
          if (updatedMessages) {
            promises.push(updateConversationMessages(c.id, updatedMessages));
          }
          return updatedConversation as Conversation;
        });
        await Promise.all(promises);
        setConversations(conversationsWithoutMessages);
      } else {
        setConversations(updatedConversations);
      }
    },
    [setConversations, updateConversationMessages],
  );

  const updateMessagesAndConversation = useCallback(
    async (
      changedMessages: Message[],
      conversationMessages: Message[],
      partialConversation: Partial<Conversation>,
      selectedConversationId: string, // = conversationId,
      selectedConversations = conversations,
    ) => {
      const updatedConversations = updateOrCreateConversation(
        selectedConversationId,
        selectedConversations,
        partialConversation,
        getMessageContentAsString(conversationMessages?.[0]),
      );
      const updatedMessages = mergeMessages(conversationMessages, changedMessages);
      await updateConversations(updatedConversations);
      await updateConversationMessages(selectedConversationId, updatedMessages);

      const updatedConversationId = selectedConversationId;
      const updatedConversation = getConversation(
        updatedConversationId,
        updatedConversations,
      ) as Conversation;
      return { updatedConversation, updatedConversations, updatedMessages };
    },
    [conversations, updateConversations, updateConversationMessages],
  );

  const deleteConversation = useCallback(
    async (
      id: string,
      deleteFiles: boolean,
      cleanup?: (conversation: Conversation, conversations: Conversation[]) => Promise<void>,
    ) => {
      const conversation = getConversation(id, conversations) as Conversation;
      if (!conversation) {
        logger.info(`deleteConversation conversation doesn't exist : ${id}`);
      }
      const updatedConversations = removeConversation(id, conversations);
      setConversations(updatedConversations);
      // Delete any orphans messages
      await removeConversationMessages(id);
      await cleanup?.(conversation, updatedConversations);
      if (deleteFiles) {
        await deleteUnusedConversationsDir(conversations.map((c) => c.id));
      }
    },
    [conversations, setConversations],
  );

  const deleteArchive = useCallback(
    async (id: string, cleanup?: (id: string) => Promise<void>) => {
      const updatedArchives = removeConversation(id, archives);
      setArchives(updatedArchives);

      return cleanup?.(id);
    },
    [archives, setArchives],
  );

  const contextValue = useMemo(
    () => ({
      conversations,
      updateConversations,
      deleteConversation,
      isConversationMessagesLoaded,
      getConversationMessages,
      readConversationMessages,
      filterConversationMessages,
      updateConversationMessages,
      searchConversationMessages,
      updateMessagesAndConversation,
      archives,
      setArchives,
      deleteArchive,
      providers,
      setProviders,
      presets,
      setPresets,
      usage,
      setUsage,
    }),
    [
      conversations,
      updateConversations,
      deleteConversation,
      isConversationMessagesLoaded,
      getConversationMessages,
      readConversationMessages,
      filterConversationMessages,
      updateConversationMessages,
      searchConversationMessages,
      updateMessagesAndConversation,
      archives,
      setArchives,
      deleteArchive,
      providers,
      setProviders,
      presets,
      setPresets,
      usage,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export { AppContext, AppContextProvider };
