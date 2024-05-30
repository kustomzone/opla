// Copyright 2024 Mik Bry
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

import React, { useContext } from 'react';
import { AppContext } from '@/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Dialog from '@/components/common/Modal';
import OpenAIModels from '@/components/views/Providers/openai/Models';
import useProviderState from '@/hooks/useProviderState';
import useTranslation from '@/hooks/useTranslation';
import { Provider } from '@/types';
import { ModalData } from '@/context/modals';

function CloudModelDialog({
  id,
  data,
  open,
  onClose,
}: {
  id: string;
  data: ModalData;
  open: boolean;
  onClose: () => void | undefined;
}) {
  const { t } = useTranslation();
  const { providers } = useContext(AppContext);
  let selectedProvider: Provider | undefined = data?.item as Provider;
  if (!selectedProvider) {
    selectedProvider = providers.find((p) => p.name === 'OpenAI');
  }
  const { provider } = useProviderState(selectedProvider?.id, selectedProvider);

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog id={id} size="lg" open={open} onClose={handleClose}>
      {provider && provider.name === 'OpenAI' && (
        <Card className="flex h-full w-full flex-col bg-transparent">
          <CardHeader className="flex-none">
            <CardTitle>{t('Choose Cloud Models')}</CardTitle>
            <CardDescription className="">{t('Models to chat with.')}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <OpenAIModels provider={provider} className="h-[400px]" title="OpenAI" />
          </CardContent>
        </Card>
      )}
    </Dialog>
  );
}

export default CloudModelDialog;