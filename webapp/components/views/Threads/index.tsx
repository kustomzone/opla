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

import { useContext, useState } from 'react';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import useBackend from '@/hooks/useBackendContext';
import { Conversation, PageSettings } from '@/types';
import { DefaultPageSettings } from '@/utils/constants';
import logger from '@/utils/logger';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import { getConversation } from '@/utils/data/conversations';
import { ModalIds } from '@/modals';
import { ModalsContext } from '@/context/modals';
import { AppContext } from '@/context';
import { MenuAction, Page, ViewName } from '@/types/ui';
import { getAssistantId } from '@/utils/services';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../ui/resizable';
import Explorer from './Explorer';
import Settings from './Settings';
import Thread from './Thread';
import Archive from './Archive';
import ToolbarTogglePanels from './ToolbarTogglePanels';


const getSelectedPage = (selectedThreadId: string | undefined, view: ViewName) =>
  `${view === ViewName.Recent ? Page.Threads : Page.Archives}${selectedThreadId ? `/${selectedThreadId}` : ''}`;

type ThreadsProps = {
  selectedThreadId?: string;
  view?: ViewName;
};

export default function Threads({ selectedThreadId, view = ViewName.Recent }: ThreadsProps) {
  const router = useRouter();
  const { id } = router.query;
  const [errors, setError] = useState<string[]>([]);
  const handleError = (error: string) => {
    setError([...errors, error]);
  };

  const {
    conversations,
    updateConversations,
    deleteConversation,
    getConversationMessages,
    updateConversationMessages,
    archives,
    setArchives,
    deleteArchive,
  } = useContext(AppContext);
  const { backendContext, setSettings } = useBackend();

  const searchParams = useSearchParams();
  const selectedConversation = conversations.find((c) => c.id === selectedThreadId);
  const assistantId = searchParams?.get('assistant') || getAssistantId(selectedConversation);

  useShortcuts(ShortcutIds.DELETE_MESSAGE, (event) => {
    event.preventDefault();
    logger.info('TODO delete Message');
  });
  useShortcuts(ShortcutIds.EDIT_MESSAGE, (event) => {
    event.preventDefault();
    logger.info('TODO edit Message');
  });

  const { showModal } = useContext(ModalsContext);

  const selectedPage = getSelectedPage(selectedThreadId, view);

  const saveSettings = (currentPage = selectedPage, partialSettings?: Partial<PageSettings>) => {
    const { settings } = backendContext.config;
    logger.info('saveSettings', currentPage, partialSettings, backendContext.config);
    if (settings.selectedPage) {
      const pages = settings.pages || {};
      const page = pages[currentPage] || DefaultPageSettings;
      if (partialSettings) {
        setSettings({
          ...settings,
          pages: { ...pages, [currentPage]: { ...page, ...partialSettings } },
        });
      } else if (pages[currentPage]) {
        delete pages[currentPage];
        setSettings({
          ...settings,
          pages,
        });
      }
    }
  };

  useShortcuts(ShortcutIds.TOGGLE_FULLSCREEN, (event) => {
    event.preventDefault();
    logger.info('toggle fullscreen');
    const { settings } = backendContext.config;
    const pages = settings.pages || {};
    const page = pages[selectedPage] || DefaultPageSettings;
    if (page.explorerHidden && page.settingsHidden) {
      saveSettings(selectedPage, { explorerHidden: false, settingsHidden: false });
    } else {
      saveSettings(selectedPage, { explorerHidden: true, settingsHidden: true });
    }
  });

  if (id !== selectedThreadId) {
    logger.info('conflict in Threads', id, selectedThreadId);
    return null;
  }

  const deleteAndCleanupConversation = async (conversationId: string) =>
    deleteConversation(conversationId, async (cId) => {
      // Delete associated settings
      saveSettings(getSelectedPage(cId, ViewName.Recent));
    });

  const handleResizeExplorer = (size: number) => {
    saveSettings(selectedPage, { explorerWidth: size });
  };

  const handleResizeSettings = (size: number) => {
    saveSettings(selectedPage, { settingsWidth: size });
  };

  const handleChangeDisplayExplorer = (value: boolean) => {
    saveSettings(selectedPage, { explorerHidden: !value });
  };

  const handleChangeDisplaySettings = (value: boolean) => {
    saveSettings(selectedPage, { settingsHidden: !value });
  };

  const handleDelete = async (action: string, data: any) => {
    const conversation = data?.item as Conversation;
    logger.info(`delete ${action} ${data}`);
    if (conversation) {
      if (action === 'Delete') {
        deleteAndCleanupConversation(conversation.id);
        if (selectedThreadId && selectedThreadId === conversation.id) {
          router.replace(Page.Threads);
        }
      }
    }
  };

  const handleShouldDelete = (data: string) => {
    logger.info(`to delete ${data}`);
    const conversation = getConversation(data, conversations) as Conversation;
    showModal(ModalIds.DeleteItem, { item: conversation, onAction: handleDelete });
  };

  const handleSelectMenu = async (menu: MenuAction, data: string) => {
    logger.info('onSelectMenu', menu);
    if (menu === MenuAction.DeleteConversation) {
      handleShouldDelete(data);
    } else if (menu === MenuAction.ArchiveConversation) {
      const conversationToArchive = getConversation(data, conversations) as Conversation;
      const messages = getConversationMessages(conversationToArchive.id);
      await deleteAndCleanupConversation(conversationToArchive.id);
      setArchives([...archives, { ...conversationToArchive, messages }]);
    } else if (menu === MenuAction.UnarchiveConversation) {
      const { messages, ...archive } = getConversation(data, archives) as Conversation;
      await deleteArchive(archive.id, async (aId) => {
        // Delete associated settings
        saveSettings(getSelectedPage(aId, ViewName.Archives));
      });
      updateConversations([...conversations, archive as Conversation]);
      updateConversationMessages(archive.id, messages || []);
    } else if (menu === MenuAction.ChangeView) {
      if (data === ViewName.Recent) {
        router.replace(Page.Threads);
      } else {
        router.replace(Page.Archives);
      }
    }
  };

  const setThreads = (threads: Conversation[]) => {
    if (view === ViewName.Recent) {
      updateConversations(threads);
    } else {
      setArchives(threads);
    }
  };

  const defaultSettings = backendContext.config.settings;
  const pageSettings =
    defaultSettings.pages?.[selectedPage] ||
    defaultSettings.pages?.[Page.Threads] ||
    DefaultPageSettings;

  logger.info('render Threads', selectedThreadId);
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        minSize={14}
        maxSize={40}
        defaultSize={pageSettings.explorerWidth}
        onResize={handleResizeExplorer}
        className={pageSettings.explorerHidden === true ? 'hidden' : ''}
      >
        <Explorer
          view={view}
          threads={view === ViewName.Recent ? conversations : archives}
          setThreads={setThreads}
          onSelectMenu={handleSelectMenu}
          onShouldDelete={handleShouldDelete}
          selectedAssistantId={assistantId}
          selectedThreadId={selectedThreadId}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        {view !== ViewName.Archives && (
          <Thread
            conversationId={selectedThreadId}
            rightToolbar={
              <ToolbarTogglePanels
                displayExplorer={!pageSettings.explorerHidden}
                displaySettings={!pageSettings.settingsHidden}
                onChangeDisplayExplorer={handleChangeDisplayExplorer}
                onChangeDisplaySettings={handleChangeDisplaySettings}
                disabledSettings={assistantId === undefined}
              />
            }
            onSelectMenu={handleSelectMenu}
            onError={handleError}
          />
        )}
        {view === ViewName.Archives && (
          <Archive archiveId={selectedThreadId} onSelectMenu={handleSelectMenu} />
        )}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        minSize={20}
        defaultSize={20}
        maxSize={50}
        onResize={handleResizeSettings}
        className={!pageSettings.settingsHidden && view === ViewName.Recent ? '' : 'hidden'}
      >
        <Settings conversationId={selectedThreadId} errors={errors} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
