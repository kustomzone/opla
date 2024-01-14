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
import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MenuItem } from '@/types';

function ComboItem({ item, onSelect }: { item: MenuItem; onSelect: () => void }) {
  const I = item.icon as React.ElementType;
  return (
    <CommandItem
      value={item.value}
      className="ellipsis flex w-full flex-row-reverse items-center gap-2"
      onSelect={() => {
        onSelect();
      }}
    >
      <Check className={cn('mr-2 h-4 w-4', item.selected ? 'opacity-100' : 'opacity-0')} />
      <div className="grow">{item.label}</div>
      {I && <I className="h-4 w-4 shrink-0 opacity-50" />}
    </CommandItem>
  );
}
export default function Combobox({
  items,
  onSelect,
  placeholder = 'Select an item',
  searchPlaceholder,
  notFound = 'No results found.',
}: {
  items: MenuItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  notFound?: string;
  onSelect: (value?: string, data?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[200px] justify-between"
        >
          {items.find((item) => item.selected)?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[200px] p-0">
        <Command className="">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{notFound}</CommandEmpty>
          <CommandGroup>
            {items.map((item) => (
              <ComboItem
                key={item.label}
                item={item}
                onSelect={() => {
                  onSelect(item.value);
                  setOpen(false);
                }}
              />
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}