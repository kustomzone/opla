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

import Parameter, { ParameterValue } from '@/components/common/Parameter';
import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
import { Provider, ServerStatus } from '@/types';
import { deepGet } from '@/utils/data';
import SelectModel from '@/components/common/SelectModel';
import { getLocalModels, getLocalModelsAsItems } from '@/utils/data/models';
import { setActiveModel } from '@/utils/backend/commands';

export default function Opla({
  provider,
  onParameterChange,
}: {
  provider: Provider;
  onParameterChange: (name: string, value: ParameterValue) => void;
}) {
  const { t } = useTranslation();
  const { server, restart, config } = useBackend();
  const models = getLocalModels(config);
  const modelId = config.server.parameters.modelId as string;
  const selectedModel = models.find((m) => m.id === modelId || m.fileName === modelId);
  const modelPath = config.server.parameters.modelPath as string;
  const items = getLocalModelsAsItems(config, selectedModel?.id);

  const changeActiveModel = async (modelIdOrName: string) => {
    await setActiveModel(modelIdOrName);
    if (server.status === ServerStatus.STARTED || server.status === ServerStatus.STARTING) {
      const { parameters } = config.server;
      await restart(parameters);
    }
  };

  const disabled = server.status === ServerStatus.STARTING;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <form className="grid w-full items-start gap-6 overflow-auto pt-4">
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <div className="flex w-full items-center justify-between px-4 py-2">
            {t('Active model')}
            <SelectModel
              disabled={disabled}
              selectedModel={selectedModel}
              modelItems={items}
              onSelectModel={changeActiveModel}
            />
          </div>
        </fieldset>
      </form>
      <form className="grid w-full items-start gap-6 overflow-auto pt-8">
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <legend className="-ml-1 px-1 text-sm font-medium">{t('Local server')}</legend>
          <Parameter
            label={t('Description')}
            name="description"
            value={t(deepGet<Provider, string>(provider, 'description'))}
            disabled
            type="large-text"
          />
          <Parameter
            label={t('Inference engine')}
            name="metadata.server.name"
            value={deepGet(provider, 'metadata.server.name', '')}
            disabled
            type="text"
            onChange={onParameterChange}
          />
        </fieldset>
      </form>
      <form className="grid w-full items-start gap-6 overflow-auto pb-20 pt-8">
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <legend className="-ml-1 px-1 text-sm font-medium">{t('Parameters')}</legend>
          <Parameter
            label={t('Model path')}
            name="metadata.server.parameters.model"
            value={
              modelPath || deepGet(provider, 'metadata.server.parameters.modelPath', t('None'))
            }
            disabled
            type="file"
            onChange={onParameterChange}
          />
          <Parameter
            label={t('Host')}
            name="metadata.server.parameters.host"
            value={deepGet(provider, 'metadata.server.parameters.host', '')}
            type="text"
            onChange={onParameterChange}
          />
          <Parameter
            label={t('Port')}
            name="metadata.server.parameters.port"
            value={deepGet(provider, 'metadata.server.parameters.port', '')}
            type="number"
            onChange={onParameterChange}
          />
          <Parameter
            label={t('Context size')}
            name="metadata.server.parameters.contextSize"
            value={deepGet(provider, 'metadata.server.parameters.contextSize', '')}
            type="number"
            onChange={onParameterChange}
          />
          <Parameter
            label={t('Threads')}
            name="metadata.server.parameters.threads"
            value={deepGet(provider, 'metadata.server.parameters.threads', '')}
            type="number"
            onChange={onParameterChange}
          />
          <Parameter
            label={t('Number of GPU layers')}
            name="metadata.server.parameters.nGpuLayers"
            value={deepGet(provider, 'metadata.server.parameters.nGpuLayers', '')}
            type="number"
            onChange={onParameterChange}
          />
        </fieldset>
      </form>
    </div>
  );
}
