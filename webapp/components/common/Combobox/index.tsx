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

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverContentExt,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Ui } from '@/types';

function ComboItem({
  item,
  selected,
  onSelect,
}: {
  item: Ui.MenuItem;
  selected?: string;
  onSelect: () => void;
}) {
  const I = item.icon as React.ElementType;
  return (
    <CommandItem
      value={item.value}
      className="ellipsis flex w-full flex-row-reverse items-center gap-2"
      onSelect={() => {
        onSelect();
      }}
    >
      <Check
        className={cn(
          'mr-2 h-4 w-4',
          item.selected || item.value === selected ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="grow">{item.label}</div>
      {I && <I className="h-4 w-4 shrink-0 opacity-50" />}
      {item.renderIcon?.()}
    </CommandItem>
  );
}

type ComboboxProps = {
  items: Ui.MenuItem[];
  selected?: string;
  onSelect: (value?: string, index?: number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  notFound?: string;
  className?: string;
  portal?: boolean;
};

export default function Combobox({
  items,
  selected,
  onSelect,
  placeholder = 'Select an item',
  searchPlaceholder,
  notFound = 'No results found.',
  className,
  portal = true,
}: ComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const Content = portal ? PopoverContent : PopoverContentExt;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('min-w-[200px] justify-between', className)}
        >
          {items.find((item) => item.selected)?.label || selected || t(placeholder)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <Content className="min-w-[200px] p-0">
        <Command className="">
          <CommandInput placeholder={searchPlaceholder ? t(searchPlaceholder) : undefined} />
          <CommandList>
            <CommandEmpty>{t(notFound)}</CommandEmpty>
            <CommandGroup>
              {items.map((item, index) => (
                <ComboItem
                  key={item.label}
                  selected={selected}
                  item={item}
                  onSelect={() => {
                    onSelect(item.value, index);
                    setOpen(false);
                  }}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </Content>
    </Popover>
  );
}
