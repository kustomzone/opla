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

import Dialog from '@/components/common/Modal';
import Settings from './settings';

export default function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void | undefined;
}) {
  return (
    <Dialog id="settingsmodal" size="xl" open={open} onClose={onClose}>
      <Settings />
    </Dialog>
  );
}
