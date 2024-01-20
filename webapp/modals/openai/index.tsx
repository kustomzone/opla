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
import React from 'react';
import Dialog from '@/components/common/Modal';
import OpenAI from '@/components/providers/openai';
import useProviderState from '@/hooks/useProviderState';
import { Provider } from '@/types';

function OpenAIDialog({
  id,
  data,
  open,
  onClose: _onClose,
}: {
  id: string;
  data: unknown;
  open: boolean;
  onClose: () => void | undefined;
}) {
  const newProvider = data as Provider;
  const { provider, onParametersSave, onParameterChange } = useProviderState(
    newProvider?.id,
    newProvider,
  );

  const onClose = () => {
    _onClose();
  };

  const onSave = () => {
    onParametersSave({ disabled: false });
    onClose();
  };

  return (
    <Dialog id={id} size="md" open={open} onClose={onClose}>
      {provider && (
        <OpenAI
          provider={provider}
          className="w-full"
          onParameterChange={onParameterChange}
          onSave={onSave}
        />
      )}
    </Dialog>
  );
}

export default OpenAIDialog;
