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

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Model } from '@/types';
import logger from '@/utils/logger';
import {
  cancelDownloadModel,
  getModelsCollection,
  installModel,
  uninstallModel,
  updateModel,
} from '@/utils/backend/commands';
import useBackend from '@/hooks/useBackendContext';
import { deepCopy, deepMerge, getEntityName, getResourceUrl } from '@/utils/data';
import { getDownloadables, isValidFormat } from '@/utils/data/models';
import { ModalIds, Page } from '@/types/ui';
import { ModalsContext } from '@/context/modals';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../ui/resizable';
import Explorer from './Explorer';
import ModelView from './Model';
import NewLocalModel from './NewLocalModel';
import { ParametersRecord } from '../../common/Parameter';

export default function Models({ selectedModelId }: { selectedModelId?: string }) {
  const { backendContext, updateBackendStore } = useBackend();
  const [collection, setCollection] = useState<Model[]>([]);
  const { showModal } = useContext(ModalsContext);
  const router = useRouter();

  useEffect(() => {
    const getCollection = async () => {
      const coll = (await getModelsCollection()) as unknown as { models: Model[] };
      const models = coll.models
        .filter((m) => m.featured === true)
        .map((m) => ({ ...m, id: m.name }));
      setCollection(models);
    };
    getCollection();
  }, []);

  const models = backendContext.config.models.items;
  let local = true;
  let model = models.find((m) => m.id === selectedModelId) as Model;
  if (!model && selectedModelId) {
    model = collection.find((m) => m.id === selectedModelId) as Model;
    local = false;
  }
  const downloadables = local
    ? []
    : getDownloadables(model).filter((d) => d.private !== true && isValidFormat(d));

  const { downloads = [] } = backendContext;

  const isDownloading = downloads.findIndex((d) => d.id === model?.id) !== -1;

  const handleInstall = async (item?: Model) => {
    const selectedModel: Model = deepMerge<Model>(model, item || {}, true);
    logger.info(`install ${model.name}`, selectedModel, item);
    if (selectedModel.private === true) {
      delete selectedModel.private;
    }
    if (selectedModel.include) {
      delete selectedModel.include;
    }
    const path = getEntityName(selectedModel.creator || selectedModel.author);
    const id = await installModel(
      selectedModel,
      getResourceUrl(selectedModel.download),
      path,
      selectedModel.name,
    );
    await updateBackendStore();
    logger.info(`installed ${id}`);
    router.push(`${Page.Models}/${id}`);
  };

  const handleUninstall = async () => {
    logger.info(`Uninstall ${model.name} model.id=${model.id}`);

    const nextModelId = models.findLast((m) => m.id !== model.id)?.id;
    await uninstallModel(model.id);
    await updateBackendStore();
    router.replace(`/models${nextModelId ? `/${nextModelId}` : ''}`);
  };

  const handleCancelDownload = async (action: string, data: any) => {
    logger.info(`Cancel download ${action} model.id=${data}`);
    await cancelDownloadModel(model.id);
  };

  const handleLocalInstall = (selectedModel?: Model) => {
    if (isDownloading) {
      showModal(ModalIds.Downloads, { item: model, onAction: handleCancelDownload });
    }
    if (local && !selectedModel) {
      handleUninstall();
      return;
    }
    let item: Model = selectedModel || model;
    // If the model is not a GGUF model, we need to find the recommended or first download
    if (!isValidFormat(item) && downloadables.length > 0) {
      item = downloadables.find((d) => d.recommended) || downloadables[0];
    }

    if (isValidFormat(item)) {
      handleInstall(item);
    } else {
      logger.info(`No valid format ${item?.name} ${item?.library}`);
      // TODO: display toaster
    }
  };

  const handleParametersChange = async (id: string | undefined, parameters: ParametersRecord) => {
    logger.info(`change model parameters ${id} ${parameters}`);
    // onParametersChange(id, parameters);
    let updatedModel = models.find((m) => m.id === id) as Model;
    if (updatedModel) {
      let needUpdate = false;
      updatedModel = deepCopy<Model>(updatedModel);
      Object.keys(parameters).forEach((key) => {
        switch (key) {
          case 'name':
            if (parameters[key] !== updatedModel.name) {
              updatedModel.name = parameters[key] as string;
              needUpdate = true;
            }
            break;
          case 'description':
            if (parameters[key] !== updatedModel.description) {
              updatedModel.description = parameters[key] as string;
              needUpdate = true;
            }
            break;
          case 'author':
            if (parameters[key] !== updatedModel.author) {
              updatedModel.author = parameters[key] as string;
              needUpdate = true;
            }
            break;
          default:
            logger.warn(`unknown parameter ${key}`);
        }
      });
      if (needUpdate) {
        await updateModel(updatedModel);
        await updateBackendStore();
      }
    }
    return undefined;
  };

  const handleModelRename = async (name: string, id: string) => {
    const updatedModel = models.find((m) => m.id === id);
    logger.info(`change model name ${id} ${name}`, updatedModel, models);
    if (updatedModel && updatedModel.name !== name) {
      await updateModel({ ...updatedModel, name });
      await updateBackendStore();
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={24} minSize={20}>
        <Explorer
          models={models}
          selectedModelId={selectedModelId}
          collection={collection}
          onModelRename={handleModelRename}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <ModelView
          model={model}
          isDownloading={isDownloading}
          local={local}
          downloadables={downloadables}
          onChange={handleLocalInstall}
          onParametersChange={handleParametersChange}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export { NewLocalModel };