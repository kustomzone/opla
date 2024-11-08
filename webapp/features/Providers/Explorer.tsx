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

import { useContext } from 'react';
import { useRouter } from 'next/router';
import { Plus, Server } from 'lucide-react';
import { Ui, Provider, ProviderType } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { ModalsContext } from '@/modals/context';
import {
  createProvider,
  deleteProvider,
  findProvider,
  getProviderState,
  updateProvider,
} from '@/utils/data/providers';
import OpenAI from '@/utils/providers/openai';
import useBackend from '@/hooks/useBackendContext';
import { ModalIds } from '@/modals';
import { BasicState, Page } from '@/types/ui';
import { shortcutAsText } from '@/utils/shortcuts';
import { ShortcutIds } from '@/hooks/useShortcuts';
import { getStateColor } from '@/utils/ui';
import Explorer, { ExplorerGroup, ExplorerList } from '@/components/common/Explorer';
import { useProviderStore } from '@/stores';
import { Button } from '../../components/ui/button';
import OpenAIIcon from '../../components/icons/OpenAI';

type ProvidersExplorerProps = {
  selectedId?: string;
};

function ProvidersExplorer({ selectedId: selectedProviderId }: ProvidersExplorerProps) {
  const { providers, setProviders } = useProviderStore();
  const { server } = useBackend();

  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const router = useRouter();

  const chatGPT = providers.find(
    (p: Provider) => p.type === ProviderType.openai && p.name === OpenAI.template.name,
  );

  const handleSetupChatGPT = () => {
    let openAI = chatGPT as Provider;
    if (!chatGPT) {
      openAI = createProvider(OpenAI.template.name as string, OpenAI.template);
    }
    showModal(ModalIds.OpenAI, { item: openAI });
    router.push(`${Page.Providers}/${openAI.id}`);
  };

  const createNewProvider = () => {
    logger.info('create new provider');
    showModal(ModalIds.NewProvider);
  };

  const handleDelete = async (action: string, data: any) => {
    const provider = data?.item as Provider;
    logger.info(`delete ${action} ${data}`);
    if (provider) {
      if (action === 'Delete') {
        const updatedProviders = deleteProvider(provider.id, providers);
        setProviders(updatedProviders);
        if (selectedProviderId && selectedProviderId === provider.id) {
          router.replace(Page.Providers);
        }
      }
    }
  };

  const handleToDelete = (data: string) => {
    logger.info(`to delete ${data}`);
    const provider = findProvider(data, providers) as Provider;
    showModal(ModalIds.DeleteItem, { item: provider, onAction: handleDelete });
  };

  const handleProviderToggle = (data: string) => {
    logger.info('onProviderToggle');
    const provider = findProvider(data, providers) as Provider;
    const newProviders = updateProvider({ ...provider, disabled: !provider?.disabled }, providers);
    setProviders(newProviders);
  };

  const handleSelectProvider = (id: string) => {
    logger.info(`onSelectProvider ${id}`);
    const route = Ui.Page.Providers;
    router.push(`${route}/${id}`);
  };

  const menu: Ui.MenuItem[] = [
    {
      label: t('Disable'),
      onSelect: (data: string) => {
        logger.info(`disable ${data}`);
        handleProviderToggle(data);
      },
    },
    {
      label: t('Delete'),
      onSelect: handleToDelete,
    },
  ];
  const menuDisabled: Ui.MenuItem[] = [
    {
      label: t('Enable'),
      onSelect: (data: string) => {
        logger.info(`enable ${data}`);
        handleProviderToggle(data);
      },
    },
    {
      label: t('Delete'),
      onSelect: handleToDelete,
    },
  ];

  return (
    <Explorer
      title={t('Providers')}
      toolbar={
        <>
          {!chatGPT && (
            <Button
              aria-label={t('Configure ChatGPT')}
              title={`${t('Configure ChatGPT')} ${shortcutAsText(ShortcutIds.NEW_PROVIDER)}`}
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                handleSetupChatGPT();
              }}
            >
              <OpenAIIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            </Button>
          )}
          <Button
            aria-label={t('New AI provider')}
            title={`${t('New AI provider')} ${shortcutAsText(ShortcutIds.NEW_PROVIDER)}`}
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              createNewProvider();
            }}
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          </Button>
        </>
      }
    >
      <ExplorerGroup className="h-full pb-12">
        <ExplorerList<Provider>
          selectedId={selectedProviderId}
          items={providers}
          onSelectItem={handleSelectProvider}
          renderRightSide={(provider) => (
            <div className={getStateColor(getProviderState(provider, server.status), 'text')}>
              <Server className="h-4 w-4" strokeWidth={1.5} />
            </div>
          )}
          menu={(provider) =>
            getProviderState(provider, server.status) !== BasicState.active ? menuDisabled : menu
          }
        />
      </ExplorerGroup>
    </Explorer>
  );
}

export default ProvidersExplorer;
