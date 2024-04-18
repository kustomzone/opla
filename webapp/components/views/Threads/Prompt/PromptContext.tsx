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

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  EmptyParsedPrompt,
  EmptyPromptToken,
  ParsedPrompt,
  PromptToken,
  TokenValidator,
  comparePrompts,
  parsePrompt,
  toPrompt,
} from '@/utils/parsers';
import validator from '@/utils/parsers/validator';
import { AIService, Assistant, Conversation, PromptTemplate, Usage } from '@/types';
import {
  addConversationService,
  createConversation,
  getConversation,
  getConversationModelId,
  getDefaultConversationName,
  updateConversation,
} from '@/utils/data/conversations';
import { CommandManager } from '@/utils/commands/types';
import { AppContext } from '@/context';
import { getActiveService } from '@/utils/services';
import { getMentionCommands } from '@/utils/commands';
import { tokenize } from '@/utils/providers';
import useBackend from '@/hooks/useBackendContext';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import { getDefaultAssistantService } from '@/utils/data/assistants';
import useTranslation from '@/hooks/useTranslation';

type Context = {
  conversationPrompt: ParsedPrompt;
  changedPrompt: ParsedPrompt | undefined;
  setChangedPrompt: (prompt: ParsedPrompt | undefined) => void;
  parseAndValidatePrompt: (text: string, caretStartIndex?: number) => ParsedPrompt;
  clearPrompt: (
    conversation: Conversation | undefined,
    newConversations: Conversation[],
  ) => Conversation[];
  handleChangePrompt: (prompt: ParsedPrompt) => void;
  selectTemplate: (template: PromptTemplate) => void;
  tokenValidator: TokenValidator;
  usage: Usage | undefined;
};

const PromptContext = createContext<Context | undefined>(undefined);

type PromptProviderProps = {
  conversationId: string | undefined;
  selectedConversation: Conversation | undefined;
  tempConversationId: string | undefined;
  assistant: Assistant | undefined;
  selectedModelId: string | undefined;
  commandManager: CommandManager;
  service: AIService | undefined;
  onUpdateTempConversation: (id: string | undefined) => void;
  onUpdateService: (service: AIService | undefined) => void;
};
function PromptProvider({
  conversationId,
  selectedConversation,
  tempConversationId,
  selectedModelId,
  assistant,
  service,
  commandManager,
  onUpdateTempConversation,
  onUpdateService,
  children,
}: PropsWithChildren<PromptProviderProps>) {
  const { t } = useTranslation();
  const context = useContext(AppContext);
  const { conversations, providers, updateConversations } = context;
  const { config } = useBackend();
  const [usage, updateUsage] = useState<Usage | undefined>({ tokenCount: 0 });
  const [changedPrompt, setChangedPrompt] = useState<ParsedPrompt | undefined>(undefined);

  const tokenValidator = useCallback(
    (
      token: PromptToken,
      parsedPrompt: ParsedPrompt,
      _previousToken: PromptToken | undefined,
    ): [PromptToken, PromptToken | undefined] =>
      validator(commandManager, token, parsedPrompt, _previousToken),
    [commandManager],
  );
  const parseAndValidatePrompt = useCallback(
    (text: string, caretStartIndex = 0) => parsePrompt({ text, caretStartIndex }, tokenValidator),
    [tokenValidator],
  );

  const conversationPrompt = useMemo(
    () => toPrompt(selectedConversation?.currentPrompt || '', tokenValidator),
    [selectedConversation?.currentPrompt, tokenValidator],
  );

  useEffect(() => {
    const afunc = async () => {
      const text = changedPrompt?.text || conversationPrompt?.text;
      if (
        usage?.conversationId !== selectedConversation?.id ||
        (text !== usage?.text && (selectedConversation?.currentPrompt || changedPrompt))
      ) {
        const modelsCommands = getMentionCommands(
          changedPrompt || conversationPrompt,
          commandManager,
        );
        const selectedModelNameOrId =
          modelsCommands[0]?.key ||
          getConversationModelId(selectedConversation, assistant) ||
          selectedModelId;
        const activeService = getActiveService(
          selectedConversation,
          assistant,
          providers,
          config,
          selectedModelNameOrId,
        );
        const response = await tokenize(activeService, text || '');
        updateUsage({
          conversationId: selectedConversation?.id,
          text,
          tokenCount: response?.tokens.length || 0,
          activeService,
        });
      }
    };
    afunc();
  }, [
    changedPrompt,
    conversationPrompt,
    selectedConversation,
    commandManager,
    assistant,
    providers,
    config,
    selectedModelId,
    usage,
  ]);

  const clearPrompt = useCallback(
    (conversation: Conversation | undefined, newConversations: Conversation[]) => {
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
    },
    [updateConversations],
  );

  const handleUpdatePrompt = useCallback(
    (prompt: ParsedPrompt | undefined, conversationName = getDefaultConversationName(t)) => {
      if (prompt?.raw === '' && tempConversationId) {
        setChangedPrompt(undefined);
        updateConversations(conversations.filter((c) => !c.temp));
        onUpdateTempConversation(undefined);
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
        let newConversation = createConversation(conversationName);
        newConversation.temp = true;
        newConversation.currentPrompt = prompt;
        if (assistant) {
          const newService = getDefaultAssistantService(assistant);
          newConversation = addConversationService(newConversation, newService);
          onUpdateService(undefined);
        } else if (service) {
          newConversation = addConversationService(newConversation, service);
          onUpdateService(undefined);
        }
        updatedConversations.push(newConversation);
        onUpdateTempConversation(newConversation.id);
      }
      updateConversations(updatedConversations);
      setChangedPrompt(undefined);
    },
    [
      t,
      tempConversationId,
      conversationId,
      conversations,
      updateConversations,
      assistant,
      service,
      onUpdateTempConversation,
      onUpdateService,
    ],
  );

  useDebounceFunc<ParsedPrompt | undefined>(handleUpdatePrompt, changedPrompt, 500);

  const handleChangePrompt = useCallback(
    (prompt: ParsedPrompt) => {
      if (prompt.raw !== conversationPrompt?.raw) {
        setChangedPrompt(prompt);
      }
    },
    [conversationPrompt],
  );

  const selectTemplate = useCallback(
    (template: PromptTemplate) => {
      handleUpdatePrompt(parseAndValidatePrompt(template.value), template.name);
    },
    [handleUpdatePrompt, parseAndValidatePrompt],
  );

  const value = useMemo(
    () => ({
      conversationPrompt,
      clearPrompt,
      parseAndValidatePrompt,
      changedPrompt,
      setChangedPrompt,
      handleChangePrompt,
      tokenValidator,
      selectTemplate,
      usage,
    }),
    [
      conversationPrompt,
      clearPrompt,
      parseAndValidatePrompt,
      changedPrompt,
      handleChangePrompt,
      tokenValidator,
      selectTemplate,
      usage,
    ],
  );

  return <PromptContext.Provider value={value}>{children}</PromptContext.Provider>;
}

const usePromptContext = (): Context => {
  const context = useContext(PromptContext);
  if (!context) {
    return {
      conversationPrompt: EmptyParsedPrompt,
      clearPrompt: () => [],
      parseAndValidatePrompt: () => EmptyParsedPrompt,
      changedPrompt: undefined,
      handleChangePrompt: () => {},
      tokenValidator: () => [EmptyPromptToken, undefined],
      selectTemplate: () => {},
      setChangedPrompt: () => {},
      usage: undefined,
    };
  }
  return context;
};
export { PromptProvider, PromptContext, usePromptContext };
