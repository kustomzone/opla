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
  Asset,
  ContextWindowPolicy,
  Conversation,
  ConversationConnector,
  ConversationConnectorType,
  ProviderType,
} from '@/types';
import { createBaseRecord, createBaseNamedRecord, updateRecord } from '.';

export const getConversationAssets = (conversation: Conversation) =>
  !conversation.assets || Array.isArray(conversation.assets)
    ? conversation.assets || []
    : [conversation.assets];

export const addAssetsToConversation = (
  conversation: Conversation,
  assetsAsFile: string | string[],
) => {
  const conversationAssets = getConversationAssets(conversation);
  const updatedAssets = Array.isArray(assetsAsFile)
    ? assetsAsFile.filter(
      (a) => !conversationAssets.find((asset) => asset.type === 'file' && asset.file === a),
    )
    : [assetsAsFile];
  const assets = updatedAssets.map<Asset>((a) => ({
    ...createBaseRecord<Asset>(),
    type: 'file',
    file: a,
  }));

  return {
    conversation: {
      ...conversation,
      assets: [...conversationAssets, ...assets],
    } as Conversation,
    conversationAssets,
    assets,
  };
};

export const createConversation = (name: string) => {
  const conversation: Conversation = {
    ...createBaseNamedRecord(name),
    messages: [],
    contextWindowPolicy: ContextWindowPolicy.Rolling,
    keepSystem: true,
  };
  return conversation;
};

export const getConversation = (
  conversationId: string | undefined,
  conversations: Conversation[],
) => conversations.find((c) => c.id === conversationId);

export const updateConversation = (
  conversation: Conversation,
  conversations: Conversation[],
  noUpdate = false,
) => {
  const i = conversations.findIndex((c) => c.id === conversation.id);
  if (i === -1) {
    return conversations;
  }
  if (noUpdate) {
    return conversations.map((c) => (c.id === conversation.id ? conversation : c));
  }
  const updatedConversation = updateRecord(conversation) as Conversation;
  return conversations.map((c) => (c.id === updatedConversation.id ? updatedConversation : c));
};

export const removeConversation = (conversationId: string, conversations: Conversation[]) =>
  conversations.filter((c) => c.id !== conversationId);

export const updateOrCreateConversation = (
  conversationId: string | undefined,
  conversations: Conversation[],
  title = 'Conversation',
) => {
  let conversation = conversations.find((c) => c.id === conversationId);
  let updatedConversations;
  if (conversation) {
    updatedConversations = updateConversation(conversation, conversations);
  } else {
    conversation = createConversation(title.trim().substring(0, 200));
    updatedConversations = [...conversations, conversation];
  }
  return updatedConversations;
};

export const mergeConversations = (
  conversations: Conversation[],
  newConversations: Conversation[],
) => {
  const mergedConversations = [...conversations, ...newConversations];

  const conversationMap = new Map<string, Conversation>();
  mergedConversations.forEach((c) => {
    const existingConversation = conversationMap.get(c.id);
    if (!existingConversation || c.updatedAt >= existingConversation.updatedAt) {
      conversationMap.set(c.id, c);
    }
  });
  return Array.from(conversationMap.values());
};

export const getConversationConnector = (
  conversation: Conversation,
  connectorType: ConversationConnectorType,
) => {
  let connector = conversation.connectors?.find((c) => c.type === connectorType);
  if (!connector) {
    if (conversation.model && connectorType === ConversationConnectorType.Model) {
      connector = {
        type: connectorType,
        modelId: conversation.model,
        provider: conversation.provider as ProviderType,
      };
    }
  }
  return connector;
};

export const addConnector = (
  _connectors: ConversationConnector[] | undefined,
  connector: ConversationConnector,
): ConversationConnector[] => {
  const connectors = _connectors || [];
  const index = connectors?.findIndex((c) => c.type === connector.type) ?? -1;
  if (index !== -1) {
    connectors[index] = connector;
  } else {
    connectors.push(connector);
  }
  return connectors;
};

export const addConversationConnector = (
  conversation: Conversation,
  connector: ConversationConnector,
): Conversation => {
  const index = conversation.connectors?.findIndex((c) => c.type === connector.type) ?? -1;
  const connectors = conversation.connectors || [];
  if (index !== -1) {
    connectors[index] = connector;
  } else {
    connectors.push(connector);
  }
  return {
    ...conversation,
    connectors,
  };
};

export const getConnectorModelId = (modelConnector: ConversationConnector | undefined) => {
  if (modelConnector && modelConnector.type === ConversationConnectorType.Model) {
    return modelConnector.modelId;
  }
  return undefined;
};

export const getConnectorProvider = (modelConnector: ConversationConnector | undefined) => {
  if (modelConnector && modelConnector.type === ConversationConnectorType.Model) {
    return modelConnector.provider;
  }
  return undefined;
};

export const getConversationModelId = (conversation: Conversation | undefined) => {
  if (!conversation) {
    return undefined;
  }
  const modelConnector = getConversationConnector(conversation, ConversationConnectorType.Model);
  return getConnectorModelId(modelConnector);
};

export const getConversationProvider = (conversation: Conversation | undefined) => {
  if (!conversation) {
    return undefined;
  }
  const modelConnector = getConversationConnector(conversation, ConversationConnectorType.Model);
  return getConnectorProvider(modelConnector);
};
