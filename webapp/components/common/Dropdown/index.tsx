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

import { useRef } from 'react';
import { PiCaretDown } from 'react-icons/pi';
import { IconType } from 'react-icons';
import useClickOutside from '@/hooks/useClickOutside';
import { MenuItem } from '@/types';
import Menu from '../Menu';

export default function Dropdown({
  items,
  onSelect,
}: {
  items: MenuItem[];
  onSelect: (value?: string, data?: string) => void;
}) {
  const target = useRef<HTMLDivElement>(null);
  const peer = useRef<HTMLInputElement>(null);
  const onClose = () => {
    if (peer.current) {
      peer.current.checked = false;
    }
  };
  const { toggleModal } = useClickOutside(target, onClose);
  const selectedItem = items.find((item) => item.selected);
  const itemsWithSelection = items.map((item) => ({
    ...item,
    selected: item.selected || item.value === selectedItem?.value,
  }));
  const I = selectedItem?.icon as IconType;
  return (
    <div ref={target} className="relative w-full">
      <label className="w-full" aria-label={selectedItem?.label}>
        <input
          ref={peer}
          type="checkbox"
          className="peer hidden"
          onChange={() => {
            toggleModal();
          }}
        />
        <div className="flex cursor-pointer flex-row rounded-md border border-neutral-300 px-2 py-1 hover:border-neutral-500 peer-checked:[&>*:nth-child(2)]:-rotate-180">
          <div className="flex flex-1 flex-row items-center pr-4 dark:text-neutral-300">
            {selectedItem?.icon && <I className="mr-2 h-4 w-4" />}
            <p className="mr-4 flex-1 text-left">{selectedItem?.label || ' '}</p>
          </div>
          <div className="flex items-center transition-transform">
            <PiCaretDown className="h-4 w-4 text-neutral-400 " />
          </div>
        </div>
        <div className="z-1000 pointer-events-none absolute left-0 top-7 rounded-lg bg-neutral-300 p-2 opacity-0 shadow-lg transition-all peer-checked:pointer-events-auto peer-checked:opacity-100 dark:bg-neutral-800">
          <Menu items={itemsWithSelection} onClose={onClose} onSelect={onSelect} />
        </div>
      </label>
    </div>
  );
}