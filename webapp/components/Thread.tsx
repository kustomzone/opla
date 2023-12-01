// Copyright 2023 mik
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
import { BiChevronDown } from 'react-icons/bi';
import { AppContext } from '@/context';
import { Message } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { createdMessage, updateConversationMessages } from '@/utils/conversations';
import MessageView from './Message';
import Prompt from './Prompt';

function Thread({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { conversations, setConversations } = useContext(AppContext);
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');

  const { t } = useTranslation();

  logger.info(`${conversationId} ${selectedConversation?.messages?.length}`);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => selectedConversation?.messages || [],
    [selectedConversation?.messages],
  );
  const [showEmptyChat, setShowEmptyChat] = useState(messages.length < 1);

  // logger.info(`${conversationId} ${messages.length}`);
  const selectedPreset = 'LLama2';

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
    if (message.length < 1) {
      setErrorMessage(t('Please enter a message.'));
      return;
    }
    setErrorMessage('');

    setIsLoading(true);

    const toMessage = createdMessage({ role: 'user', name: 'you' }, message);
    const fromMessage = createdMessage({ role: 'system', name: selectedPreset }, '...');
    const { newConversationId, newConversations } = updateMessages([toMessage, fromMessage]);

    setMessage('');
    setShowEmptyChat(false);

    fromMessage.content = 'What?';
    updateMessages([fromMessage], newConversationId, newConversations);
  };

  return (
    <div className="flex flex-1 flex-col dark:bg-gray-900">
      <div className="flex flex-col items-center text-sm">
        <div className="justify-left flex w-full flex-row items-center gap-1 bg-gray-50 p-3 text-gray-500 dark:bg-gray-950 dark:text-gray-300">
          <div className="mx-3 flex h-7 flex-row items-center rounded-md border border-gray-600 px-2">
            {/* <span className="gap-1 py-1 text-gray-700 dark:text-gray-500">{t('Model')} :</span> */}
            <span className="items-center truncate truncate px-3 dark:text-gray-300">
              {selectedPreset}
            </span>
            <span className="right-0 flex items-center pr-2">
              <BiChevronDown className="h-4 w-4 text-gray-400" />
            </span>
          </div>
          <div className="hidden rounded-md border border-gray-600 px-3 py-1">
            {t('No plugins installed')}
          </div>
        </div>
      </div>
      <div className="flex h-[80%] w-full flex-grow flex-col">
        <div className="flex flex-col overflow-y-auto">
          {showEmptyChat ? (
            <div className="relative flex h-full w-full flex-col py-10">
              <h1 className="flex h-screen items-center justify-center gap-2 text-center text-2xl font-semibold text-gray-200 dark:text-gray-600">
                {t('Chat with your local GPT')}
              </h1>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageView key={msg.id} message={msg} />
              ))}
              <div className="h-4 w-full flex-shrink-0" />
              <div ref={bottomOfChatRef} />
            </>
          )}
          <div className="flex flex-col items-center text-sm dark:bg-gray-900" />
        </div>
      </div>
      <Prompt
        message={message}
        isLoading={isLoading}
        errorMessage={errorMessage}
        handleMessage={sendMessage}
        updateMessage={setMessage}
      />
    </div>
  );
}

export default Thread;
