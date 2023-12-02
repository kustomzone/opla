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

'use client';

import '@/app/globals.css';
import Sidebar from '@/components/Sidebar';
import useToggle from '@/hooks/useToggle';
import SettingsModal from '@/modals';
import { useState } from 'react';
import Portal from './Portal';
import Dialog from './Dialog';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isModalOpen, onModalOpen, onModalClose] = useToggle(false);
  const [settingTab, setSettingTab] = useState<string>();

  const handleModalDisplay = () => {
    onModalOpen();
  };

  return (
    <div className="flex h-screen w-full select-none overflow-hidden">
      <Sidebar onModal={handleModalDisplay} />
      {children}
      <Portal>
        <SettingsModal
          open={isModalOpen}
          settingTab={settingTab}
          onTabChanged={setSettingTab}
          onClose={onModalClose}
        />
        <Dialog title="Welcome to Opla" actions={[{ label: 'Ok' }, { label: 'Cancel' }]}>
          <div>An open-source app</div>
        </Dialog>
      </Portal>
    </div>
  );
}
