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
import Image from 'next/image';
import { BrainCircuit, MessagesSquare, Package, Server, Settings, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/context/modals';
import logger from '@/utils/logger';
import { ModalIds } from '@/modals';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useBackend from '@/hooks/useBackendContext';
import { Item } from '@/types';
import { ShortcutIds } from '@/hooks/useShortcuts';
import SidebarItems from './SidebarItems';

const sidebarItems: Array<Item> = [
  {
    name: 'Tools',
    flex: 1,
    items: [
      {
        name: 'Threads',
        href: '/threads',
        page: '/threads',
        icon: MessagesSquare,
        shortcut: ShortcutIds.DISPLAY_THREADS,
      },
      {
        name: 'Models',
        href: '/models',
        icon: BrainCircuit,
        shortcut: ShortcutIds.DISPLAY_MODELS,
      },
      {
        name: 'AI Providers',
        href: '/providers',
        icon: Server,
        shortcut: ShortcutIds.DISPLAY_PROVIDERS,
      },
      {
        name: 'Plugins',
        href: '/plugins',
        icon: Package,
        hidden: true,
      },
    ],
  },
  {
    name: 'Config',
    items: [
      {
        name: 'Profile',
        href: '/profile',
        icon: UserCircle2,
        hidden: true,
      },
      {
        name: 'Settings',
        icon: Settings,
        modal: true,
        items: [
          {
            name: 'Settings',
            href: '/settings',
            shortcut: ShortcutIds.DISPLAY_SETTINGS,
            modal: true,
          },
          {
            name: 'Keyboard shortcuts',
            href: '/shortcuts',
            shortcut: ShortcutIds.DISPLAY_SHORTCUTS,
            modal: true,
          },
          { name: '-' },
          { name: 'Check for updates...', href: '/updates', modal: true },
        ],
      },
    ],
  },
];

function Sidebar() {
  const router = useRouter();
  const { pathname } = router;
  logger.info('pathname', pathname);
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const { backendContext } = useBackend();
  const defaultSettings = backendContext?.config.settings;
  (sidebarItems[0].items as Item[])[0].href = defaultSettings?.selectedPage?.startsWith('/threads')
    ? defaultSettings?.selectedPage
    : '/threads';
  const onModal = (href: string) => {
    if (href === '/settings') {
      showModal(ModalIds.Settings);
    } else if (href === '/shortcuts') {
      showModal(ModalIds.Shortcuts);
    }
  };

  return (
    <aside className="flex h-full flex-col border-r-[1px] border-neutral-300/30 bg-neutral-100 p-1 dark:border-neutral-900 dark:bg-neutral-800">
      <div className="flex hidden items-center justify-center border-b border-neutral-300 p-1 dark:border-neutral-600">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link className="mb-1 h-8 w-8" href="/">
              <Image width={32} height={32} className="" src="/logo.png" alt="logo" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('Dashboard')}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <ul className="p1 flex h-full flex-1 flex-col">
        <SidebarItems items={sidebarItems} pathname={pathname} t={t} onModal={onModal} />
      </ul>
    </aside>
  );
}

export default Sidebar;
