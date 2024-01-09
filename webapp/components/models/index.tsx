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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Model } from '@/types';
import logger from '@/utils/logger';
import { getModelsCollection, installModel, uninstallModel } from '@/utils/backend/commands';
// import { ModalsContext } from '@/context/modals';
import { deepMerge } from '@/utils/data';
// import { ModalIds } from '@/modals';
import useBackend from '@/hooks/useBackend';
import {
  getEntityName,
  getDownloadables,
  getResourceUrl,
  isValidFormat,
} from '@/utils/data/models';
import SplitView from '../common/SplitView';
import Explorer from './Explorer';
import ModelView from './Model';

export default function Models({ selectedModelId }: { selectedModelId?: string }) {
  const { getBackendContext, updateBackendStore } = useBackend();
  const [collection, setCollection] = useState<Model[]>([]);
  // const { showModal } = useContext(ModalsContext);
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
  logger.info('collection: ', collection);

  const models = getBackendContext().config.models.items;
  let local = true;
  let model = models.find((m) => m.id === selectedModelId) as Model;
  if (!model && selectedModelId) {
    model = collection.find((m) => m.id === selectedModelId) as Model;
    local = false;
  }
  const downloadables = local
    ? []
    : getDownloadables(model).filter((d) => d.private !== true && isValidFormat(d));

  const onInstall = async (item?: Model) => {
    const selectedModel: Model = deepMerge(model, item || {}, true);
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
    router.push(`/models/${id}`);
  };

  const onUninstall = async () => {
    logger.info(`Uninstall ${model.name} model.id=${model.id}`);

    const nextModelId = models.findLast((m) => m.id !== model.id)?.id;
    await uninstallModel(model.id);
    await updateBackendStore();
    router.replace(`/models${nextModelId ? `/${nextModelId}` : ''}`);
  };

  const onChange = (selectedModel?: Model) => {
    if (local && !selectedModel) {
      // showModal(ModalIds.DeleteItem, { item: model, onAction: onUninstall });
      onUninstall();
      return;
    }
    let item: Model = selectedModel || model;
    // If the model is not a GGUF model, we need to find the recommended or first download
    if (!isValidFormat(item) && downloadables.length > 0) {
      item = downloadables.find((d) => d.recommended) || downloadables[0];
    }

    if (isValidFormat(item)) {
      // showModal(ModalIds.DownloadItem, { item, onAction: onInstall });
      onInstall(item);
    } else {
      logger.info(`No valid format ${item?.name} ${item?.library}`);
      // TODO: display toaster
    }
  };

  const backendContext = getBackendContext();
  const { downloads = [] } = backendContext;

  const isDownloading = downloads.findIndex((d) => d.id === model?.id) !== -1;

  return (
    <SplitView
      className="grow overflow-hidden"
      left={<Explorer models={models} selectedModelId={selectedModelId} collection={collection} />}
    >
      <ModelView
        model={model}
        isDownloading={isDownloading}
        local={local}
        downloadables={downloadables}
        onChange={onChange}
      />
    </SplitView>
  );
}
