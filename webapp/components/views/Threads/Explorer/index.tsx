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
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Archive,
  Check,
  FolderClock,
  FolderInput,
  Import,
  MessageSquareWarning,
  MoreHorizontal,
  SquarePen,
} from 'lucide-react';
import { Conversation, Ui } from '@/types';
import useBackend from '@/hooks/useBackendContext';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  getConversation,
  mergeConversations,
  updateConversation,
} from '@/utils/data/conversations';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import { openFileDialog, readTextFile, saveFileDialog, writeTextFile } from '@/utils/backend/tauri';
import {
  importChatGPTConversation,
  validateChaGPTConversations,
} from '@/utils/conversations/openai';
import { getConversationTitle, validateConversations } from '@/utils/conversations';
import { MenuAction, Page, ViewName } from '@/types/ui';
import { AppContext } from '@/context';
import Explorer, { ExplorerList, ExplorerGroup } from '@/components/common/Explorer';
import { OplaAssistant } from '@/stores/assistants';
import { DefaultPageSettings, DefaultThreadsExplorerGroups } from '@/utils/constants';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from '../../../ui/Toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import { Button } from '../../../ui/button';
import { ShortcutBadge } from '../../../common/ShortCut';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../ui/tooltip';
import EmptyView from '../../../common/EmptyView';
import AssistantsList from './AssistantsList';

type ExplorerProps = {
  selectedAssistantId: string | undefined;
  selectedThreadId?: string;
  threads: Conversation[];
  archives: Conversation[];
  setThreads: (conversations: Conversation[]) => void;
  onShouldDelete: (id: string) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
};

export default function ThreadsExplorer({
  selectedAssistantId,
  selectedThreadId,
  threads,
  archives,
  setThreads,
  onShouldDelete,
  onSelectMenu,
}: ExplorerProps) {
  const router = useRouter();
  const { getConversationMessages } = useContext(AppContext);
  const { backendContext } = useBackend();
  const { settings } = backendContext.config;
  const threadsSettings = settings.pages?.[Page.Threads] || {
    ...DefaultPageSettings,
    explorerGroups: DefaultThreadsExplorerGroups,
  };

  const [editableConversation, setEditableConversation] = useState<string | undefined>(undefined);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleRename = (data: string) => {
    logger.info(`rename ${data}`);
    setEditableConversation(data);
  };

  const handleChangeConversationName = (value: string, id: string) => {
    const conversation = getConversation(id, threads) as Conversation;
    if (conversation) {
      conversation.name = value;
    }
    const updatedConversations = updateConversation(conversation, threads, true);
    setThreads(updatedConversations);
    logger.info(`onChangeConversationName ${editableConversation} ${value} ${id}`);
  };

  const handleImportConversations = async () => {
    logger.info('onImportConversations');
    try {
      const filePath = await openFileDialog(false, [
        { name: 'conversations', extensions: ['json'] },
      ]);
      if (!filePath) {
        return;
      }
      const content = await readTextFile(filePath as string, false);
      const importedConversations = JSON.parse(content);
      const validate = validateConversations(importedConversations);
      if (validate.success) {
        const mergedConversations = mergeConversations(threads, importedConversations);
        setThreads(mergedConversations);
        toast.message(t('Imported and merged'));
        return;
      }

      const validateGPT = validateChaGPTConversations(importedConversations);
      if (!validateGPT.success) {
        toast.error(`${t('Unable to import')} : ${validateGPT.error}`);
        return;
      }
      const newConversations = importChatGPTConversation(validateGPT.data);
      const mergedConversations = mergeConversations(threads, newConversations);
      setThreads(mergedConversations);
      toast.message(t('Imported and merged'));
    } catch (error) {
      logger.error(error);
      toast.error(`${t('Unable to import')} : ${error}`);
    }
  };

  const handleExportConversations = async () => {
    logger.info('onExportConversations');
    try {
      const filePath = await saveFileDialog([{ name: 'conversations', extensions: ['json'] }]);
      if (!filePath) {
        return;
      }
      const exportedConversations = threads.map((c) => {
        let { messages } = c;
        if (!messages) {
          messages = getConversationMessages(c.id);
          return { c, messages };
        }
        return c;
      });
      const content = JSON.stringify(exportedConversations);
      await writeTextFile(filePath as string, content, false);
    } catch (error) {
      logger.error(error);
      toast.error(`Unable to export : ${error}`);
    }
  };

  const handleSelectThread = (id: string, view: ViewName) => {
    logger.info(`onSelectThread ${id}`);
    const route = view === ViewName.Archives ? Ui.Page.Archives : Ui.Page.Threads;
    router.push(`${route}/${id}`); // , undefined, { shallow: true });
  };

  const handleSelectAssistant = (id: string) => {
    logger.info(`onSelectAssistant ${id}`);
    if (id === OplaAssistant.id) {
      router.push(Ui.Page.Threads);
      return;
    }
    router.push(`${Ui.Page.Threads}/?assistant=${id}`);
  };

  useShortcuts(ShortcutIds.NEW_CONVERSATION, (event) => {
    if (selectedThreadId) {
      event.preventDefault();
      logger.info('shortcut new Conversation');
      router.push(Ui.Page.Threads);
      toast.message('New Conversation');
    }
  });
  useShortcuts(ShortcutIds.DELETE_CONVERSATION, (event) => {
    if (selectedThreadId) {
      event.preventDefault();
      logger.info('shortcut delete Conversation');
      onShouldDelete(selectedThreadId);
    }
  });
  useShortcuts(ShortcutIds.RENAME_CONVERSATION, (event) => {
    if (selectedThreadId) {
      event.preventDefault();
      logger.info('shortcut rename Conversation');
      handleRename(selectedThreadId);
    }
  });

  const menu: Ui.MenuItem[] = [
    {
      label: t('Rename'),
      onSelect: handleRename,
    },
    {
      label: t('Delete'),
      onSelect: onShouldDelete,
    },
  ];
  const explorerGroups = threadsSettings.explorerGroups || DefaultThreadsExplorerGroups;
  const recentGroup = explorerGroups.find((g) => g.title === ViewName.Recent);
  const archivesGroup = explorerGroups.find((g) => g.title === ViewName.Archives);
  const showRecent = recentGroup?.hidden === false;
  const showArchives = archivesGroup?.hidden === false;
  const closedRecent = recentGroup?.closed === true;
  const closedArchives = archivesGroup?.closed === true;

  return (
    <Explorer
      title="Threads"
      toolbar={
        <>
          {selectedThreadId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  disabled={!selectedThreadId}
                  className="cursor-pointer items-center p-1"
                >
                  <Link href={Ui.Page.Threads}>
                    <SquarePen className="h-4 w-4" strokeWidth={1.5} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={12} className="mt-1">
                <div className="flex w-full flex-row gap-2">
                  <p>{t('New conversation')}</p>
                  <ShortcutBadge command={ShortcutIds.NEW_CONVERSATION} />
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full">
              <DropdownMenuLabel>{t('Views')}</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="flex w-full items-center justify-between"
                  onSelect={() => {
                    onSelectMenu(MenuAction.ChangeView, ViewName.Recent);
                  }}
                >
                  <div className="flex flex-1 items-center capitalize">
                    <FolderClock className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {t(ViewName.Recent)}
                  </div>
                  {showRecent && <Check className="h-4 w-4" strokeWidth={1.5} />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex w-full items-center justify-between"
                  onSelect={() => {
                    onSelectMenu(MenuAction.ChangeView, ViewName.Archives);
                  }}
                >
                  <div className="flex flex-1 items-center capitalize">
                    <Archive className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {t(ViewName.Archives)}
                  </div>
                  {showArchives && <Check className="h-4 w-4" strokeWidth={1.5} />}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('Tools')}</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={handleImportConversations}>
                  <Import className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Import')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportConversations}>
                  <FolderInput className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Export')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      <div className="flex-1 flex-col space-y-1 overflow-y-auto overflow-x-hidden p-1 dark:border-white/20">
        <div className="flex h-full grow flex-col gap-2 pb-2 text-sm">
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel id="assistant" className="!overflow-y-auto">
              <AssistantsList selectedId={selectedAssistantId} onSelect={handleSelectAssistant} />
            </ResizablePanel>
            <ResizableHandle />
            {showRecent && (
              <>
                <ResizablePanel id="recent" className="!overflow-y-auto pt-2" minSize={3}>
                  <ExplorerGroup
                    title={t(ViewName.Recent)}
                    closed={closedRecent}
                    onToggle={() => {
                      onSelectMenu(MenuAction.ToggleGroup, ViewName.Recent);
                    }}
                    className="h-full"
                  >
                    {threads.length > 0 && (
                      <ExplorerList<Conversation>
                        selectedId={selectedThreadId}
                        items={threads.sort(
                          (c1, c2) => c2.updatedAt - c1.updatedAt || c2.createdAt - c1.createdAt,
                        )}
                        editable
                        getItemTitle={(c) => `${getConversationTitle(c, t)}${c.temp ? '...' : ''}`}
                        isEditable={(c) => !c.temp && c.id === selectedThreadId}
                        renderItem={(c) => (
                          <>
                            <span>{getConversationTitle(c, t).replaceAll(' ', '\u00a0')}</span>
                            {c.temp ? <span className="ml-2 animate-pulse">...</span> : ''}
                          </>
                        )}
                        onSelectItem={(item) => handleSelectThread(item, ViewName.Recent)}
                        onChange={handleChangeConversationName}
                        menu={() => menu}
                      />
                    )}
                    {threads.length === 0 && (
                      <div className="h-full">
                        <EmptyView
                          title={t('No threads')}
                          description={t("Don't be shy, say hi!")}
                          icon={
                            <MessageSquareWarning
                              className="h-12 w-12 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                          }
                          className="h-full"
                        />
                      </div>
                    )}
                  </ExplorerGroup>
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}
            {showArchives && (
              <>
                <ResizablePanel id="archives" className="!overflow-y-auto pt-2" minSize={3}>
                  <ExplorerGroup
                    title={t(ViewName.Archives)}
                    closed={closedArchives}
                    onToggle={() => {
                      onSelectMenu(MenuAction.ToggleGroup, ViewName.Archives);
                    }}
                    className="h-full"
                  >
                    {archives.length > 0 && (
                      <ExplorerList<Conversation>
                        selectedId={selectedThreadId}
                        items={archives.sort(
                          (c1, c2) => c2.updatedAt - c1.updatedAt || c2.createdAt - c1.createdAt,
                        )}
                        getItemTitle={(c) => `${getConversationTitle(c, t)}${c.temp ? '...' : ''}`}
                        renderItem={(c) => (
                          <>
                            <span>{getConversationTitle(c, t).replaceAll(' ', '\u00a0')}</span>
                            {c.temp ? <span className="ml-2 animate-pulse">...</span> : ''}
                          </>
                        )}
                        onSelectItem={(item) => handleSelectThread(item, ViewName.Archives)}
                        onChange={handleChangeConversationName}
                        menu={() => menu}
                      />
                    )}
                    {archives.length === 0 && (
                      <div className="h-full">
                        <EmptyView
                          title={t('No archives')}
                          description={t('No conversation in archives')}
                          icon={
                            <Archive
                              className="h-12 w-12 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                          }
                          className="h-full"
                        />
                      </div>
                    )}
                  </ExplorerGroup>
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </Explorer>
  );
}
