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

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import { AppContext } from '@/context';
import {
  Asset,
  Conversation,
  AIService,
  AIServiceType,
  Message,
  MessageStatus,
  ProviderType,
} from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createConversation,
  getConversation,
  updateConversation,
  getConversationAssets,
  getServiceModelId,
  getConversationModelId,
  addService,
  addConversationService,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { completion } from '@/utils/providers';
import { getModelsAsItems } from '@/utils/data/models';
import { getActiveService } from '@/utils/services';
import { toast } from '@/components/ui/Toast';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { MenuAction, Page } from '@/types/ui';
import { ParsedPrompt, PromptToken, comparePrompts, parsePrompt, toPrompt } from '@/utils/parsers';
import { getConversationTitle } from '@/utils/conversations';
import validator from '@/utils/parsers/validator';
import {
  createMessage,
  changeMessageContent,
  getMessageRawContentAsString,
} from '@/utils/data/messages';
import { getCommandManager, preProcessingCommands } from '@/utils/commands';
import ContentView from '@/components/common/ContentView';
import { useAssistantStore } from '@/stores';
import { getDefaultAssistantService } from '@/utils/data/assistants';
import PromptArea from './Prompt';
import { ConversationPanel } from './Conversation';
import ThreadMenu from './Menu';

function Thread({
  conversationId: _conversationId,
  rightToolbar,
  onSelectMenu,
  onError,
}: {
  conversationId?: string;
  rightToolbar: React.ReactNode;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onError: (error: string) => void;
}) {
  const router = useRouter();
  const {
    providers,
    conversations,
    readConversationMessages,
    updateConversations,
    getConversationMessages,
    filterConversationMessages,
    updateConversationMessages,
    updateMessagesAndConversation,
    setUsage,
    setProviders,
    presets,
  } = useContext(AppContext);
  const { backendContext, setActiveModel } = useBackend();
  const searchParams = useSearchParams();
  const assistantId = searchParams?.get('assistant') || undefined;
  const { getAssistant } = useAssistantStore();
  const assistant = getAssistant(assistantId);
  const [service, setService] = useState<AIService | undefined>(undefined);
  const activeModel = getServiceModelId(service) || backendContext.config.models.activeModel;
  const [tempConversationId, setTempConversationId] = useState<string | undefined>(undefined);
  const conversationId = _conversationId || tempConversationId;
  const selectedConversation = conversations.find((c) => c.id === conversationId);
  const [changedPrompt, setChangedPrompt] = useState<ParsedPrompt | undefined>(undefined);
  const { showModal } = useContext(ModalsContext);
  const [messages, setMessages] = useState<Message[] | undefined>(undefined);
  const [isMessageUpdating, setIsMessageUpdating] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<{ [key: string]: string }>({});

  const { t } = useTranslation();

  const disabled = !activeModel;

  useEffect(() => {
    const getNewMessages = async () => {
      let newMessages: Message[] = [];
      if (conversationId && selectedConversation) {
        newMessages = await readConversationMessages(selectedConversation.id, []);
        const stream = backendContext.streams?.[conversationId as string];
        newMessages = newMessages.filter((m) => !(m.author.role === 'system'));
        newMessages = newMessages.map((msg, index) => {
          if (stream && index === newMessages.length - 1) {
            return {
              ...msg,
              status: 'stream',
              content: stream.content.join(''),
              contentHistory: undefined,
            } as Message;
          }
          return { ...msg, conversationId };
        });
      }
      setMessages(newMessages);
      setIsMessageUpdating(false);
    };
    if (isMessageUpdating) {
      return;
    }
    logger.info('getNewMessages', conversationId, selectedConversation, isMessageUpdating);
    setIsMessageUpdating(true);
    getNewMessages();
  }, [
    backendContext.streams,
    conversationId,
    filterConversationMessages,
    readConversationMessages,
    isMessageUpdating,
    selectedConversation,
  ]);

  const tempConversationName = messages?.[0]?.content as string;

  const selectedModelNameOrId = getConversationModelId(selectedConversation) || activeModel;

  const { modelItems, commandManager } = useMemo(() => {
    const items = getModelsAsItems(providers, backendContext, selectedModelNameOrId);
    const manager = getCommandManager(items);
    return { modelItems: items, commandManager: manager };
  }, [backendContext, providers, selectedModelNameOrId]);

  useEffect(() => {
    if (_conversationId && tempConversationId) {
      setTempConversationId(undefined);
    }
    if (!tempConversationId && !_conversationId) {
      const temp = conversations.find((c) => c.temp);
      if (temp) {
        setTempConversationId(temp.id);
      }
    }
    if (_conversationId && conversations.find((c) => c.temp)) {
      updateConversations(conversations.filter((c) => !c.temp));
    }
  }, [_conversationId, conversations, updateConversations, tempConversationId]);

  const tokenValidator = useCallback(
    (
      token: PromptToken,
      parsedPrompt: ParsedPrompt,
      _previousToken: PromptToken | undefined,
    ): [PromptToken, PromptToken | undefined] =>
      validator(commandManager, token, parsedPrompt, _previousToken),
    [commandManager],
  );

  const currentPrompt = useMemo(
    () => toPrompt(selectedConversation?.currentPrompt || '', tokenValidator),
    [selectedConversation?.currentPrompt, tokenValidator],
  );

  const parseAndValidatePrompt = (text: string, caretStartIndex = 0) =>
    parsePrompt({ text, caretStartIndex }, tokenValidator);

  const changeService = async (
    model?: string,
    provider = ProviderType.opla,
    partial: Partial<Conversation> = {},
  ) => {
    logger.info(
      `ChangeService ${model} ${provider} activeModel=${typeof activeModel}`,
      selectedConversation,
    );
    const newService: AIService = {
      type: AIServiceType.Model,
      modelId: model as string,
      providerType: provider,
    };
    if (model && selectedConversation) {
      const services = addService(selectedConversation.services, newService);
      const newConversations = updateConversation(
        { ...selectedConversation, services, parameters: {}, ...partial },
        conversations,
        true,
      );
      updateConversations(newConversations);
    } else if (model && !activeModel) {
      await setActiveModel(model);
    } else if (model) {
      setService(newService);
    }
  };

  const sendMessage = async (
    message: Message,
    conversationMessages: Message[],
    conversation: Conversation,
    updatedConversations: Conversation[],
    prompt: ParsedPrompt,
  ) => {
    const returnedMessage = { ...message };
    const activeService = getActiveService(
      conversation,
      assistant,
      providers,
      activeModel,
      backendContext,
      message.author.name,
    );
    logger.info('sendMessage', activeService, conversation, presets);

    try {
      const response = await completion(
        activeService,
        message,
        conversationMessages,
        conversation,
        presets,
        prompt,
        commandManager,
      );
      setUsage(response.usage);
      returnedMessage.content = response.content.trim();
    } catch (e: any) {
      logger.error('sendMessage', e, typeof e);
      const error = String(e);
      onError(error);
      setErrorMessage({ ...errorMessage, [conversation.id]: error });
      returnedMessage.content = t('Oops, something went wrong.');
      returnedMessage.status = MessageStatus.Error;
      const { provider } = activeService;
      if (provider) {
        const { errors = [] } = provider || { errors: [] };
        const len = errors.unshift(error);
        if (len > 50) {
          errors.pop();
        }
        provider.errors = errors;
        const updatedProviders = providers.map((p) => (p.id === provider?.id ? provider : p));
        setProviders(updatedProviders);
      }

      toast.error(String(e));
    }
    returnedMessage.status = MessageStatus.Delivered;

    await updateMessagesAndConversation(
      [returnedMessage],
      conversationMessages,
      conversation.name,
      conversation.id,
      updatedConversations,
    );
    return returnedMessage;
  };

  const clearPrompt = (
    conversation: Conversation | undefined,
    newConversations = conversations,
  ) => {
    setChangedPrompt(undefined);

    let updatedConversations = newConversations;
    if (conversation) {
      updatedConversations = updateConversation(
        { ...conversation, currentPrompt: undefined, temp: false },
        newConversations,
      );
      updateConversations(updatedConversations);
    }
    return updatedConversations;
  };

  const handleSendMessage = async () => {
    if (conversationId === undefined) {
      return;
    }

    const result = await preProcessingCommands(
      conversationId,
      currentPrompt,
      commandManager,
      selectedConversation as Conversation,
      conversations,
      tempConversationName,
      selectedModelNameOrId,
      { changeService, getConversationMessages, updateMessagesAndConversation, t },
    );
    if (result.type === 'error') {
      setErrorMessage({ ...errorMessage, [conversationId]: result.error });
      return;
    }
    if (result.type === 'return') {
      clearPrompt(result.updatedConversation, result.updatedConversations);
      return;
    }
    const { modelName } = result;

    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    const userMessage = createMessage(
      { role: 'user', name: 'you' },
      currentPrompt.text,
      currentPrompt.raw,
    );
    let message = createMessage(
      { role: 'assistant', name: modelName || selectedModelNameOrId },
      '...',
    );
    message.status = MessageStatus.Pending;
    userMessage.sibling = message.id;
    message.sibling = userMessage.id;

    const {
      updatedConversation,
      updatedConversations: uc,
      updatedMessages,
    } = await updateMessagesAndConversation(
      [userMessage, message],
      getConversationMessages(conversationId),
      tempConversationName,
      conversationId,
    );
    let updatedConversations = uc;
    if (updatedConversation.temp) {
      updatedConversation.name = getConversationTitle(updatedConversation);
    }

    updatedConversations = clearPrompt(updatedConversation, updatedConversations);

    logger.info('onSendMessage', updatedMessages, updatedConversation);
    message = await sendMessage(
      message,
      updatedMessages,
      updatedConversation,
      updatedConversations,
      currentPrompt,
    );

    if (tempConversationId) {
      router.push(`${Page.Threads}/${tempConversationId}`);
    }

    setIsProcessing({ ...isProcessing, [conversationId]: false });
  };

  const handleResendMessage = async (
    previousMessage: Message,
    conversationMessages = getConversationMessages(conversationId),
  ) => {
    if (conversationId === undefined) {
      return;
    }
    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    let message: Message = changeMessageContent(
      previousMessage,
      '...',
      '...',
      MessageStatus.Pending,
    );

    const { updatedConversation, updatedConversations, updatedMessages } =
      await updateMessagesAndConversation(
        [message],
        conversationMessages,
        tempConversationName,
        conversationId,
      );

    const index = updatedMessages.findIndex((m) => m.id === message.id);
    const prompt = parseAndValidatePrompt(
      getMessageRawContentAsString(updatedMessages[index - 1]) || '',
    );
    message = await sendMessage(
      message,
      updatedMessages,
      updatedConversation,
      updatedConversations,
      prompt,
    );

    setIsProcessing({ ...isProcessing, [conversationId]: false });
  };

  const handleDeleteMessages = async (action: string, data: ModalData) => {
    if (conversationId === undefined) {
      return;
    }

    const message = data?.item as Message;
    logger.info(`delete ${action} ${data}`);
    if (message) {
      if (action === 'Delete') {
        const conversation = getConversation(conversationId, conversations);
        if (conversation) {
          const updatedMessages = filterConversationMessages(
            conversationId,
            (m) => m.id !== message.id && m.id !== message.sibling,
          );
          updateConversationMessages(conversationId, updatedMessages);
          if (message.assets) {
            conversation.assets = getConversationAssets(conversation).filter(
              (a: Asset) => !message.assets?.find((ma: string) => ma === a.id),
            );
          }
        }
      }
    }
  };

  const handleShouldDeleteMessage = (message: Message) => {
    showModal(ModalIds.DeleteItem, {
      title: 'Delete this message and siblings ?',
      item: message,
      onAction: handleDeleteMessages,
    });
  };

  const handleShouldDeleteAssets = (message: Message) => {
    showModal(ModalIds.DeleteItem, {
      title: 'Delete this message and assets ?',
      item: message,
      onAction: handleDeleteMessages,
    });
  };

  const handleChangeMessageContent = async (
    message: Message,
    newContent: string,
    submit: boolean,
  ) => {
    if (conversationId === undefined) {
      return;
    }

    const conversation = getConversation(conversationId, conversations);
    if (conversation && message.content) {
      const parsedContent = parseAndValidatePrompt(newContent);
      const newMessage = changeMessageContent(message, parsedContent.text, parsedContent.raw);
      const conversationMessages = getConversationMessages(conversationId);
      const newMessages = conversationMessages.map((m) => {
        if (m.id === message.id) {
          return newMessage;
        }
        return m;
      });
      const { updatedMessages } = await updateMessagesAndConversation(
        newMessages,
        conversationMessages,
        tempConversationName,
        conversationId,
        conversations,
      );

      if (submit) {
        const sibling = updatedMessages.find((m) => m.id === message.sibling);
        if (sibling) {
          await handleResendMessage(sibling, updatedMessages);
        }
      }
    }
  };

  const handleUpdatePrompt = useCallback(
    (prompt: ParsedPrompt | undefined, conversationName = 'Conversation') => {
      if (prompt?.raw === '' && tempConversationId) {
        setChangedPrompt(undefined);
        updateConversations(conversations.filter((c) => !c.temp));
        setTempConversationId(undefined);
        return;
      }
      const conversation = getConversation(conversationId, conversations) as Conversation;
      if (conversation && comparePrompts(conversation.currentPrompt, prompt)) {
        setChangedPrompt(undefined);
        return;
      }
      let updatedConversations: Conversation[];
      if (conversation) {
        conversation.currentPrompt = prompt;
        updatedConversations = conversations.filter((c) => !(c.temp && c.id !== conversationId));
        updatedConversations = updateConversation(conversation, updatedConversations, true);
      } else {
        updatedConversations = conversations.filter((c) => !c.temp);
        const newConversation = createConversation('Conversation');
        updatedConversations.push(newConversation);
        newConversation.temp = true;
        newConversation.name = conversationName;
        newConversation.currentPrompt = prompt;
        if (assistant) {
          const newService = getDefaultAssistantService(assistant);
          addConversationService(newConversation, newService);
          setService(undefined);
        } else if (service) {
          addConversationService(newConversation, service);
          setService(undefined);
        }
        setTempConversationId(newConversation.id);
      }
      updateConversations(updatedConversations);
      setChangedPrompt(undefined);
    },
    [tempConversationId, conversationId, conversations, updateConversations, service],
  );

  useDebounceFunc<ParsedPrompt | undefined>(handleUpdatePrompt, changedPrompt, 500);

  const handleChangePrompt = (prompt: ParsedPrompt) => {
    if (prompt.raw !== currentPrompt.raw) {
      setChangedPrompt(prompt);
    }
  };

  const prompt = changedPrompt === undefined ? currentPrompt : changedPrompt;
  return (
    <ContentView
      header={
        <ThreadMenu
          selectedAssistantId={assistantId}
          selectedModelName={selectedModelNameOrId}
          selectedConversationId={conversationId}
          modelItems={modelItems}
          onSelectModel={changeService}
          onSelectMenu={onSelectMenu}
        />
      }
      toolbar={rightToolbar}
    >
      <ConversationPanel
        selectedConversation={selectedConversation}
        messages={messages}
        disabled={disabled}
        isPrompt={!!prompt}
        onResendMessage={handleResendMessage}
        onDeleteMessage={handleShouldDeleteMessage}
        onDeleteAssets={handleShouldDeleteAssets}
        onChangeMessageContent={handleChangeMessageContent}
        onSelectPrompt={handleUpdatePrompt}
        parseAndValidatePrompt={parseAndValidatePrompt}
      />
      {(prompt || (messages && messages[0]?.conversationId === conversationId)) && (
        <PromptArea
          conversationId={conversationId as string}
          disabled={disabled}
          commandManager={commandManager}
          prompt={prompt}
          isLoading={conversationId ? isProcessing[conversationId] : false}
          errorMessage={conversationId ? errorMessage[conversationId] : ''}
          onSendMessage={handleSendMessage}
          onUpdatePrompt={handleChangePrompt}
          tokenValidate={tokenValidator}
        />
      )}
    </ContentView>
  );
}

export default Thread;
