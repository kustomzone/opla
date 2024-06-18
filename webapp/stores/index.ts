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

// import { emit as emitStateEvent, listen } from "@tauri-apps/api/event";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Assistant, Project, Workspace } from '@/types';
import logger from '@/utils/logger';
import createAssistantSlice, { AssistantSlice } from './assistant';
import Storage, { createJSONSliceStorage } from './storage';
import createWorkspaceSlice, { WorkspaceSlice } from './workspace';
import { EVENTS, Emitter, GlobalAppState } from './constants';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emit: Emitter = async (key: number, value: any) => {
  const { emit: emitStateEvent } = await import('@tauri-apps/api/event');
  emitStateEvent(EVENTS.STATE_CHANGE_EVENT, {
    key,
    value,
  });
};

export const useAssistantStore = create<AssistantSlice>()(
  persist(
    (...a) => ({
      ...createAssistantSlice()(...a),
    }),
    {
      name: 'assistants',
      storage: createJSONSliceStorage<Assistant>(() => Storage, { space: 2 }),
    },
  ),
);

export const useWorkspaceStore = create<WorkspaceSlice>()((...a) => ({
  ...createWorkspaceSlice(emit)(...a),
}));

const getKey = (key: number) => {
  if (key === GlobalAppState.ACTIVE) {
    return 'activeWorkspaceId';
  }
  if (key === GlobalAppState.WORKSPACE) {
    return 'workspace';
  }
  if (key === GlobalAppState.PROJECT) {
    return 'project';
  }
  return 'error';
};

export const subscribeStateSync = async () => {
  const { listen } = await import('@tauri-apps/api/event');
  const unsubscribeStateSyncListener = await listen(EVENTS.STATE_SYNC_EVENT, (event) => {
    let { key, value } = event.payload as any;
    logger.info(`State event: ${event} ${key} ${value}`);
    if (key === GlobalAppState.WORKSPACE) {
      const { workspaces } = useWorkspaceStore.getState();
      workspaces[key] = value as Workspace;
      key = 'workspaces';
      value = workspaces;
    }
    if (key === GlobalAppState.PROJECT) {
      const { projects } = useWorkspaceStore.getState();
      projects[key] = value as Project;
      key = 'projects';
      value = projects;
    }
    useWorkspaceStore.setState({ [getKey(key) as string]: value });
  });

  return async () => {
    unsubscribeStateSyncListener();
  };
};

export default useAssistantStore;
