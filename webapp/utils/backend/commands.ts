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

// import { invoke } from '@tauri-apps/api';
import { Model, OplaServer, Payload, Provider, Store } from '@/types';
import { mapKeys } from '../data';
import { toCamelCase } from '../string';
import logger from '../logger';
import { invokeTauri } from '../tauri';

export const getOplaServerStatus = async (): Promise<Payload> => {
  const payload = (await invokeTauri('get_opla_server_status')) as Payload;
  return mapKeys(payload, toCamelCase);
};

export const getOplaServer = async (): Promise<OplaServer> => {
  const server = (await invokeTauri('get_opla_server')) as OplaServer;
  return mapKeys(server, toCamelCase);
};

export const getOplaConfig = async (): Promise<Store> => {
  const store = (await invokeTauri('get_opla_configuration')) as Store;
  return mapKeys(store, toCamelCase);
};

export const getProviderTemplate = async (): Promise<Provider> => {
  const template = (await invokeTauri('get_provider_template')) as Provider;
  return mapKeys(template, toCamelCase);
};

export const getModelsCollection = async (): Promise<{ models: [] }> => {
  try {
    const collection = (await invokeTauri('get_models_collection')) as unknown as {
      models: Model[];
    };
    logger.info('getCollection', collection);
    return await mapKeys(collection, toCamelCase);
  } catch (error) {
    logger.error(error);
  }
  return { models: [] };
};

export const installModel = async (
  model: Model,
  url: String,
  path: String,
  fileName: String,
): Promise<String> => {
  const id = (await invokeTauri('install_model', { model, url, path, fileName })) as String;
  return id;
};

export const uninstallModel = async (modelId: String) => {
  const id = (await invokeTauri('uninstall_model', { modelId })) as String;
  return id;
};
