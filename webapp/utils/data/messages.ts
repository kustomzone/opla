// Copyright 2024 mik
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

import { Asset, Author, Content, ContentType, Message, MessageStatus, Metadata } from '@/types';
import { createBaseRecord } from '.';

export const createStringArray = (content: string | string[]): string[] =>
  Array.isArray(content) ? content : [content];

export const createTextContent = (
  content: string | string[] | undefined,
  rawContent?: string | string[],
  metadata?: Metadata,
): string | Content | undefined => {
  if (!content || (typeof content === 'string' && !rawContent)) {
    return content;
  }
  const parts = createStringArray(content);
  const raw = rawContent ? createStringArray(rawContent) : undefined;
  const textContent: Content = { type: ContentType.Text, raw, parts, metadata };
  return textContent;
};

export const createMessage = (
  author: Author,
  content: string | string[] | undefined,
  rawContent?: string,
  assets?: Asset[],
): Message => {
  const message: Message = {
    ...createBaseRecord<Message>(),
    author,
    content: createTextContent(content, rawContent),
    assets: assets?.map((a) => a.id),
  };
  return message;
};

export const mergeMessages = (messages: Message[], newMessages: Message[]) => {
  const newMessagesIds = newMessages.map((m) => m.id);
  const freshNewMessages = newMessages.filter((m) => !messages.find((msg) => msg.id === m.id));
  const mergedMessages = messages.map((m) => {
    if (newMessagesIds.includes(m.id)) {
      const updatedMessage = newMessages.find((newMsg) => newMsg.id === m.id);
      return { ...m, ...updatedMessage, updatedAt: Date.now() };
    }
    return m;
  });
  return [...mergedMessages, ...freshNewMessages];
};

export const changeMessageContent = (
  previousMessage: Message,
  content: string,
  rawContent: string,
  status = previousMessage.status,
): Message => {
  const message: Message = {
    ...previousMessage,
    status,
    content: createTextContent(content, rawContent),
  };
  if (
    previousMessage.content &&
    previousMessage.content !== content &&
    previousMessage.status !== MessageStatus.Error
  ) {
    const { contentHistory = [] } = previousMessage;
    contentHistory.push(previousMessage.content);
    message.contentHistory = contentHistory;
  }
  return message;
};

export const getRawContentAsString = (messageContent: string | Content | undefined): string => {
  let content: string;
  if (messageContent && typeof messageContent !== 'string') {
    content = messageContent.raw?.join('\n') || messageContent.parts.join('\n');
  } else {
    content = messageContent || '';
  }
  return content;
};

export const getContentAsString = (messageContent: string | Content | undefined): string => {
  let content: string;
  if (messageContent && typeof messageContent !== 'string') {
    content = messageContent.parts.join('\n');
  } else {
    content = messageContent || '';
  }
  return content;
};

export const getMessageContentAsString = (message: Message): string =>
  getContentAsString(message.content);

export const getMessageRawContentAsString = (message: Message): string =>
  getContentAsString(message.content);

export const getMessageContentHistoryAsString = (
  message: Message,
  index = 0,
  raw = false,
): string => {
  const contentHistory = message.contentHistory || [];
  const content = index ? contentHistory[index - 1] : message.content;
  return raw ? getRawContentAsString(content) : getContentAsString(content);
};