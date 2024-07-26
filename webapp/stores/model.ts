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

import { StateCreator } from 'zustand';
import { Model, ModelsConfiguration } from '@/types';
import { mapKeys } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import { Emitter, GlobalAppState, StorageProps, StorageState } from './types';

type ModelProps = StorageProps & ModelsConfiguration;

export interface ModelSlice extends ModelProps {
  loadModels: () => void;
  setModels: (updatedModels: Model[]) => void;
}

export type SettingsStore = ReturnType<typeof createModelSlice>;

const DEFAULT_PROPS: ModelProps = {
  state: StorageState.INIT,
  items: [],
};

const createModelSlice =
  (emit: Emitter, initProps?: Partial<ModelSlice>): StateCreator<ModelSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    loadModels: () => {
      emit(GlobalAppState.MODELS, undefined);
    },
    setModels: (updatedModels: Model[]) => {
      const models = { ...get(), models: updatedModels };
      set(models);
      const value = mapKeys({ models }, toSnakeCase);
      emit(GlobalAppState.MODELS, value);
    },
  });

export default createModelSlice;
