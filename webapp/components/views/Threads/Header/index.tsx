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

import { useContext } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { AppContext } from '@/context';
import useBackend from '@/hooks/useBackendContext';
import { AIServiceType, Assistant, Conversation, Provider, ProviderType, Ui } from '@/types';
import { MenuAction } from '@/types/ui';
import { findProvider, updateProvider } from '@/utils/data/providers';
import { useAssistantStore } from '@/stores';
import useTranslation from '@/hooks/useTranslation';
import { getActiveService } from '@/utils/services';
import ModelMenu from './ModelMenu';
import AssistantMenu from './AssistantMenu';
import AssistantTitle from './AssistantTitle';
import ModelTitle from './ModelTitle';
import ServiceBadge from './ServiceBadge';

export type ThreadMenuProps = {
  selectedAssistantId: string | undefined;
  selectedModelId: string | undefined;
  selectedConversationId?: string;
  modelItems: Ui.MenuItem[];
  onSelectModel: (model: string, provider: ProviderType) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
};

export default function ThreadHeader({
  selectedAssistantId,
  selectedModelId,
  selectedConversationId,
  modelItems,
  onSelectModel,
  onSelectMenu,
}: ThreadMenuProps) {
  const { getAssistant } = useAssistantStore();
  const { conversations, providers, setProviders } = useContext(AppContext);
  const { config } = useBackend();

  const conversation = conversations.find((c) => c.id === selectedConversationId) as
    | Conversation
    | undefined;

  const assistant = getAssistant(selectedAssistantId) as Assistant;
  const service = getActiveService(conversation, assistant, providers, config, selectedModelId);
  const selectedModel = service.model;
  const modelId = selectedModel?.id || selectedModelId;

  const selectedItem = modelItems.find((item) => item.key === modelId);

  const selectedTargetId =
    service?.type === AIServiceType.Assistant ? service.targetId : assistant?.targets?.[0]?.id;
  const target = assistant?.targets?.find((t) => t.id === selectedTargetId);

  const { t } = useTranslation();

  const handleEnableProvider = () => {
    if (selectedItem?.group) {
      const provider = findProvider(selectedItem?.group, providers) as Provider;
      if (provider && provider.disabled) {
        const newProviders = updateProvider(
          { ...(provider as Provider), disabled: !provider?.disabled },
          providers,
        );
        setProviders(newProviders);
      }
    }
  };

  let title;
  if (selectedAssistantId) {
    title = <AssistantTitle assistant={assistant} />;
  } else if (selectedModel) {
    title = <ModelTitle selectedModel={selectedModel} />;
  } else if (modelItems.length === 0 && !selectedConversationId) {
    return (
      <div className="flex w-full flex-col items-start justify-between px-4 py-0 sm:flex-row sm:items-center">
        <div className="flex grow items-center justify-between p-2 text-sm font-extrabold leading-none">
          {t('Welcome to Opla')}
        </div>
      </div>
    );
  } else {
    title = (
      <div className="flex items-center justify-center text-error">
        <AlertTriangle className="mr-4 h-4 w-4" strokeWidth={1.5} />
        <span>
          {t('No local model found.')}{' '}
          {modelItems.length === 0 ? t('Install one') : t('Select one')}
        </span>
        <ArrowRight className="ml-4 h-4 w-4" strokeWidth={1.5} />
      </div>
    );
  }

  let targetState = Ui.BasicState.disabled;

  if (target && !target.disabled) {
    targetState = Ui.BasicState.active;
  } else if (selectedItem && selectedItem.state) {
    targetState = selectedItem.state;
  }
  let badge;

  if (target && targetState) {
    badge = (
      <ServiceBadge
        state={targetState}
        providerName={target?.provider}
        handleEnableProvider={handleEnableProvider}
      />
    );
  } else if (selectedItem) {
    badge = (
      <ServiceBadge
        state={selectedItem.state}
        providerName={selectedItem?.group}
        handleEnableProvider={handleEnableProvider}
      />
    );
  }
  const menu = selectedAssistantId ? (
    <AssistantMenu
      assistant={assistant}
      target={target}
      conversation={conversation}
      onSelectMenu={() => {
        throw new Error('Function not implemented.');
      }}
    />
  ) : (
    <ModelMenu
      selectedModelId={selectedModelId}
      selectedConversationId={selectedConversationId}
      modelItems={modelItems}
      onSelectModel={onSelectModel}
      onSelectMenu={onSelectMenu}
    />
  );

  return (
    <div className="flex w-full flex-col items-start justify-between rounded-md border px-4 py-0 sm:flex-row sm:items-center">
      <div className="flex grow items-center justify-between text-sm font-medium leading-none">
        {title}
        <div className="flex-1" />
        {badge}
      </div>

      {menu}
    </div>
  );
}
