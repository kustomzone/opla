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

import { useTranslation } from 'react-i18next';
import Dialog from '@/components/common/Modal';
import AlertDialog from '@/components/common/AlertDialog';
import { BaseNamedRecord } from '@/types';
import { ModalRef } from '@/context/modals';
import SettingsPanel from './settings';
import NewProviderPanel from './templates/NewProvider';

enum ModalIds {
  Settings = 'settings',
  NewProvider = 'newprovider',
  Welcome = 'welcome',
  DeleteItem = 'deleteitem',
  DownloadItem = 'downloaditem',
}

const Modals: ModalRef[] = [
  {
    id: ModalIds.Settings,
    Component: function SettingsDialog({ visible, onClose }) {
      return (
        <Dialog
          key={ModalIds.Settings}
          id={ModalIds.Settings}
          size="xl"
          open={visible}
          onClose={onClose}
        >
          <SettingsPanel />
        </Dialog>
      );
    },
  },
  {
    id: ModalIds.NewProvider,
    Component: function NewProviderDialog({ visible, onClose }) {
      return (
        <NewProviderPanel
          key={ModalIds.NewProvider}
          id={ModalIds.NewProvider}
          open={visible}
          onClose={onClose}
        />
      );
    },
  },
  {
    id: ModalIds.Welcome,
    Component: function NewProviderDialog({ visible, onClose }) {
      const { t } = useTranslation();
      return (
        <AlertDialog
          key={ModalIds.Welcome}
          id={ModalIds.Welcome}
          title={t('Welcome to Opla!')}
          actions={[{ label: t("Let's go!") }]}
          visible={visible}
          onClose={onClose}
        >
          <div>{t('The ultimate Open-source generative AI App')} </div>
        </AlertDialog>
      );
    },
  },
  {
    id: ModalIds.DeleteItem,
    Component: function DeleteItemDialog({ visible, onClose, data }) {
      const { t } = useTranslation();
      const item = data?.item as BaseNamedRecord;
      return (
        <AlertDialog
          key={ModalIds.DeleteItem}
          id={ModalIds.DeleteItem}
          title={t('Delete this item?')}
          actions={[
            { label: t('Delete'), value: 'Delete' },
            { label: t('Cancel'), value: 'Cancel' },
          ]}
          visible={visible}
          onClose={onClose}
          data={data}
        >
          <div>{item?.name || ''}</div>
        </AlertDialog>
      );
    },
  },
  {
    id: ModalIds.DownloadItem,
    Component: function DownloadItemDialog({ visible, onClose, data }) {
      const { t } = useTranslation();
      const item = data?.item as BaseNamedRecord;
      return (
        <AlertDialog
          key={ModalIds.DownloadItem}
          id={ModalIds.DownloadItem}
          title={t('Download this item?')}
          actions={[
            { label: t('Download'), value: 'Download' },
            { label: t('Cancel'), value: 'Cancel' },
          ]}
          visible={visible}
          onClose={onClose}
          data={data}
        >
          <div>{item?.name || ''}</div>
        </AlertDialog>
      );
    },
  },
];

export default Modals;

export { ModalIds };
