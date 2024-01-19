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

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { AppContext } from '@/context';
import { Conversation, Message, Prompt } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createMessage,
  getConversation,
  updateConversation,
  updateConversationMessages,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackend';
import { completion } from '@/utils/providers/opla';
import { findModel, getLocalModelsAsItems, getProviderModelsAsItems } from '@/utils/data/models';
import { toast } from '@/components/ui/Toast';
import MessageView from './Message';
import PromptArea from './Prompt';
import { ScrollArea } from '../ui/scroll-area';
import { Toggle } from '../ui/toggle';
import PromptsGrid from './PromptsGrid';
import ThreadMenu from './ThreadMenu';

function Thread({
  conversationId,
  displaySettings,
  onChangeDisplaySettings,
}: {
  conversationId?: string;
  displaySettings: boolean;
  onChangeDisplaySettings: (displaySettings: boolean) => void;
}) {
  const router = useRouter();
  const { providers, conversations, setConversations } = useContext(AppContext);
  const { getBackendContext } = useBackend();
  const backendContext = getBackendContext();
  logger.info('backendContext', backendContext);
  const { defaultModel } = backendContext.config.models;
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<{ [key: string]: string }>({});
  const { currentPrompt = '' } = selectedConversation || {};
  const { t } = useTranslation();

  logger.info(`${conversationId} ${selectedConversation?.messages?.length}`);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => selectedConversation?.messages || [],
    [selectedConversation?.messages],
  );

  const showEmptyChat = !conversationId; // messages.length < 1;

  const selectedModel = selectedConversation?.model || defaultModel;
  const localModelItems = getLocalModelsAsItems(backendContext, selectedModel);
  const cloudModelItems = getProviderModelsAsItems(providers, selectedModel);
  const modelItems = [...localModelItems, ...cloudModelItems];

  const onSelectModel = async (value?: string, data?: string) => {
    logger.info(`onSelectModel ${value} ${data}`);
    if (value && selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, model: value },
        conversations,
      );
      setConversations(newConversations);
    }
  };

  const updateMessages = (
    newMessages: Message[],
    selectedConversationId = conversationId,
    selectedConversations = conversations,
  ) => {
    const newConversations = updateConversationMessages(
      selectedConversationId,
      selectedConversations,
      newMessages,
    );
    setConversations(newConversations);

    let newConversationId = selectedConversationId;
    if (!newConversationId) {
      newConversationId = newConversations[newConversations.length - 1].id;
      router.push(`/threads/${newConversationId}`);
    }
    return { newConversationId, newConversations };
  };

  useEffect(() => {
    if (bottomOfChatRef.current) {
      bottomOfChatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (conversationId === undefined) {
      return;
    }
    if (currentPrompt.trim().length < 1) {
      const error = { ...errorMessage, [conversationId]: t('Please enter a message.') };
      setErrorMessage(error);
      return;
    }
    setErrorMessage({ ...errorMessage, [conversationId]: '' });

    setIsLoading({ ...isLoading, [conversationId]: true });

    const toMessage = createMessage({ role: 'user', name: 'you' }, currentPrompt);
    const fromMessage = createMessage({ role: 'system', name: selectedModel }, '...');
    const { newConversationId, newConversations: nc } = updateMessages([toMessage, fromMessage]);
    let newConversations = nc;

    const conversation: Conversation = getConversation(
      newConversationId,
      newConversations,
    ) as Conversation;
    conversation.currentPrompt = '';
    newConversations = updateConversation(conversation, newConversations);
    setConversations(newConversations);

    const model = findModel(conversation.model || defaultModel, backendContext.config.models.items);
    try {
      const response = await completion(model, currentPrompt, conversation?.system);
      fromMessage.content = response;
    } catch (e: any) {
      logger.error('sendMessage', e, typeof e);
      setErrorMessage({ ...errorMessage, [conversationId]: String(e) });
      fromMessage.content = t('Oops, something went wrong.');
      toast.error(String(e));
    }

    updateMessages([fromMessage], newConversationId, newConversations);

    setIsLoading({ ...isLoading, [conversationId]: false });
  };

  const setMessage = (message: string) => {
    // logger.info('setMessage', message);
    const newConversations = conversations.map((c) => {
      if (c.id === conversationId) {
        return { ...c, currentPrompt: message };
      }
      return c;
    });
    setConversations(newConversations);
  };

  const onPromptSelected = (prompt: Prompt) => {
    let newConversations: Conversation[];
    let newConversationId;
    if (conversationId) {
      const conversation = getConversation(conversationId, conversations) as Conversation;
      conversation.currentPrompt = prompt.prompt;
      newConversations = updateConversation(conversation, conversations);
    } else {
      newConversations = updateConversationMessages(conversationId, conversations, []);
      const conversation = newConversations[newConversations.length - 1];
      conversation.name = prompt.name;
      conversation.currentPrompt = prompt.prompt;
      newConversationId = conversation.id;
    }
    setConversations(newConversations);
    if (newConversationId) {
      router.push(`/threads/${newConversationId}`);
    }
  };

  return (
    <div className="flex h-full flex-col dark:bg-neutral-800/30">
      <div className="grow-0">
        <div className="justify-left flex w-full flex-row items-center gap-4 bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
          <div className="flex grow flex-row items-center">
            <ThreadMenu
              selectedModel={selectedModel}
              modelItems={modelItems}
              onSelectModel={onSelectModel}
            />
          </div>
          <div className="flex-1">
            <p className="hidden rounded-md border border-neutral-600 px-3 py-1">-</p>
          </div>
          <div className="flex-1">
            <p className="hidden rounded-md border border-neutral-600 px-3 py-1">
              {t('Preset configuration')}
            </p>
          </div>
          <div>
            <Toggle
              aria-label="Toggle thread settings"
              pressed={displaySettings}
              onPressedChange={() => onChangeDisplaySettings(!displaySettings)}
            >
              {displaySettings ? (
                <PanelRightClose strokeWidth={1.5} />
              ) : (
                <PanelRight strokeWidth={1.5} />
              )}
            </Toggle>
          </div>
        </div>
      </div>

      {showEmptyChat ? (
        <div className="flex grow flex-col py-10">
          <h1 className="flex grow items-center justify-center gap-2 text-center text-2xl font-semibold text-neutral-200 dark:text-neutral-600">
            {t('Chat with your local GPT')}
          </h1>
          <PromptsGrid onPromptSelected={onPromptSelected} />
        </div>
      ) : (
        <ScrollArea className="flex h-full flex-col">
          {messages.map((msg) => (
            <MessageView key={msg.id} message={msg} />
          ))}
          <div className="h-4 w-full" />
          <div ref={bottomOfChatRef} />
        </ScrollArea>
      )}
      <div className="flex flex-col items-center text-sm dark:bg-neutral-800/30" />

      <PromptArea
        conversationId={conversationId as string}
        message={currentPrompt}
        isLoading={conversationId ? isLoading[conversationId] : false}
        errorMessage={conversationId ? errorMessage[conversationId] : ''}
        handleMessage={sendMessage}
        updateMessage={setMessage}
      />
    </div>
  );
}

export default Thread;
