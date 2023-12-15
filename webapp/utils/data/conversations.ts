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
import { Author, Conversation, Message } from '@/types';
import { createBaseRecord, createBaseNamedRecord, updateRecord } from '.';

const createMessage = (author: Author, content: string) => {
  const message = {
    ...createBaseRecord(),
    author,
    content,
  };
  return message as Message;
};

const updateMessage = (message: Message, conversationId: string, conversations: Conversation[]) => {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) {
    return conversations;
  }
  const { messages } = conversation;
  const i = conversation.messages.findIndex((m) => m.id === message.id);
  const updatedMessage = updateRecord(message) as Message;
  if (i === -1) {
    messages.push(updatedMessage);
  } else {
    messages[i] = updatedMessage;
  }
  const newConversation = {
    ...conversation,
    messages,
  };
  return conversations.map((c) => (c.id === conversationId ? newConversation : c));
};

const mergeMessages = (messages: Message[], newMessages: Message[]) => {
  const newMessagesIds = newMessages.map((m) => m.id);
  const oldMessages = messages.filter((m) => !newMessagesIds.includes(m.id));
  const updatedMessages = newMessages.map((m) => ({ ...m, updatedAt: Date.now() }));
  return [...oldMessages, ...updatedMessages];
};

const createConversation = (name: string) => {
  const conversation = {
    ...createBaseNamedRecord(name),
    messages: [],
  };
  return conversation;
};

const getConversation = (conversationId: string | undefined, conversations: Conversation[]) =>
  conversations.find((c) => c.id === conversationId);

const updateConversation = (conversation: Conversation, conversations: Conversation[]) => {
  const i = conversations.findIndex((c) => c.id === conversation.id);
  if (i === -1) {
    return conversations;
  }
  const updatedConversation = updateRecord(conversation) as Conversation;
  return conversations.map((c) => (c.id === updatedConversation.id ? updatedConversation : c));
};

const deleteConversation = (conversationId: string, conversations: Conversation[]) =>
  conversations.filter((c) => c.id !== conversationId);

const updateConversationMessages = (
  conversationId: string | undefined,
  conversations: Conversation[],
  messages: Message[],
) => {
  let conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) {
    const title: string = (messages[0]?.content as string) || 'Conversation';
    conversation = createConversation(title.trim().substring(0, 20));
  }
  conversation.messages = mergeMessages(conversation.messages, messages);

  if (!conversationId) {
    return [...conversations, conversation];
  }

  return conversations.map((c) => (c.id === conversationId ? conversation : c)) as Conversation[];
};

export {
  createMessage,
  updateMessage,
  createConversation,
  getConversation,
  updateConversation,
  updateConversationMessages,
  deleteConversation,
};