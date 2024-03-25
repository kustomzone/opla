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

import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { Ui } from '@/types';

type EmptyViewProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonLabel?: string;
  actions?: Ui.MenuItem[];
  onCreateItem?: () => void;
  className?: string;
};
function EmptyView({
  title,
  description,
  icon,
  buttonLabel,
  className,
  onCreateItem,
  actions,
}: EmptyViewProps) {
  const renderAction = (action: Ui.MenuItem) => {
    const Actionbutton = (
      <Button
        key={action.label}
        type="button"
        variant={action.variant || 'default'}
        disabled={action.disabled}
        onClick={(e) => {
          e.preventDefault();
          action.onSelect?.(action.label);
        }}
        className={action.className}
      >
        {action.label}
      </Button>
    );
    if (action.description) {
      return (
        <HoverCard>
          <HoverCardTrigger>{Actionbutton}</HoverCardTrigger>
          <HoverCardContent>{action.description}</HoverCardContent>
        </HoverCard>
      );
    }
    return Actionbutton;
  };
  return (
    <div
      className={cn(
        'flex h-[350px] shrink-0 items-center justify-center rounded-md border border-dashed',
        className,
      )}
    >
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        {icon}
        <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">{description}</p>
        {buttonLabel && <Button onClick={onCreateItem}>{buttonLabel}</Button>}
        {actions && (
          <div className="flex gap-2">{actions.map((action) => renderAction(action))}</div>
        )}
      </div>
    </div>
  );
}

export default EmptyView;
