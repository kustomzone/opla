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

import { Conversation, Preset, Provider } from '@/types';
import { createBaseNamedRecord, deepEqual, deepMerge } from '.';

export const defaultPresets: Preset[] = [
  {
    id: 'opla',
    name: 'Opla',
    readOnly: true,
    updatedAt: 0,
    createdAt: 0,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    readOnly: true,
    updatedAt: 0,
    createdAt: 0,
  },
  {
    id: 'gpt-3.5',
    parentId: 'openai',
    name: 'ChatGPT-3.5',
    readOnly: true,
    updatedAt: 0,
    createdAt: 0,
  },
  {
    id: 'gpt-4',
    parentId: 'openai',
    name: 'ChatGPT-4',
    readOnly: true,
    updatedAt: 0,
    createdAt: 0,
  },
];

export const createPreset = (
  name: string,
  parentId: string | undefined,
  template: Partial<Preset>,
) => {
  const preset: Preset = {
    ...template,
    ...createBaseNamedRecord<Preset>(name),
    parentId,
  };
  return preset;
};

export const mergePresets = (presets: Preset[], newPresets: Preset[]) => {
  const newPresetsIds = newPresets.map((p) => p.id);
  const freshNewPresets = newPresets.filter((ps) => !presets.find((p) => p.id === ps.id));
  const mergedPresets = presets.map((ps) => {
    if (newPresetsIds.includes(ps.id)) {
      const updatedPreset = newPresets.find((newPreset) => newPreset.id === ps.id);
      if (!deepEqual(ps, updatedPreset)) {
        return { ...ps, ...updatedPreset, updatedAt: Date.now() };
      }
    }
    return ps;
  });
  return [...mergedPresets, ...freshNewPresets];
};

export const findCompatiblePreset = (
  presetId: string | undefined,
  presets: Preset[],
  model?: string,
  provider?: Provider,
) => {
  let compatiblePreset = presets.find((p) => p.id === presetId);
  if (!presetId) {
    if (model) {
      compatiblePreset = presets.find((p) => p.id.toLowerCase().indexOf(model.toLowerCase()) > -1);
    }
    if (provider && !compatiblePreset) {
      compatiblePreset = presets.find(
        (p) => p.id.toLowerCase().indexOf(provider.name.toLowerCase()) > -1,
      );
    }
  }
  return compatiblePreset;
};

export const getCompatiblePresets = (presets: Preset[], model?: string, provider?: Provider) => {
  const compatiblePresets: Record<string, boolean> = {};
  presets.forEach((p) => {
    if (model) {
      compatiblePresets[p.id] = p.id.toLowerCase().indexOf(model.toLowerCase()) > -1;
    }
    if (provider && !compatiblePresets[p.id]) {
      compatiblePresets[p.id] = p.id.toLowerCase().indexOf(provider.name.toLowerCase()) > -1;
    }
  });
  return compatiblePresets;
};

export const isKeepSystem = (preset: Preset | undefined) =>
  typeof preset?.keepSystem === 'boolean' ? preset?.keepSystem : true;

export const getCompletePresetProperties = (
  _preset: Preset | undefined,
  conversation: Conversation | undefined,
  presets: Preset[],
  includeParent = false,
) => {
  const preset = _preset || presets.find((p) => p.id === conversation?.preset) || ({} as Preset);
  let { parameters, system, contextWindowPolicy, keepSystem } = preset;
  if (includeParent && preset?.parentId) {
    const parentPreset = presets.find((p) => p.id === preset?.parentId);
    if (parentPreset) {
      parameters = deepMerge(preset?.parameters, conversation?.parameters);
      system = parentPreset?.system ?? preset?.system;
      keepSystem = parentPreset ? isKeepSystem(parentPreset) : keepSystem;
    }
  }
  parameters = deepMerge(preset?.parameters, conversation?.parameters);
  contextWindowPolicy = conversation?.contextWindowPolicy || contextWindowPolicy;
  keepSystem = conversation ? isKeepSystem(conversation as Preset) : keepSystem;
  return { ...preset, parameters, system, contextWindowPolicy, keepSystem };
};
