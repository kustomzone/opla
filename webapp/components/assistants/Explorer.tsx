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

import { useRouter } from 'next/router';
import logger from '@/utils/logger';
import useGlobalStore from '@/stores';
import { Ui } from '@/types';
import Explorer, { ExplorerList } from '../common/Explorer';

export default function AssistantsExplorer({
  selectedAssistantId,
}: {
  selectedAssistantId?: string;
}) {
  const router = useRouter();
  logger.info('AssistantsExplorer', selectedAssistantId);
  const { assistants } = useGlobalStore();

  const handleSelectItem = (id: string) => {
    logger.info(`onSelectItem ${id}`);
    const route = Ui.Page.Assistants;
    router.push(`${route}/${id}`);
  };

  return (
    <Explorer title="Assistants">
      <ExplorerList
        selectedId={selectedAssistantId}
        items={assistants}
        onSelectItem={handleSelectItem}
      />
    </Explorer>
  );
}
