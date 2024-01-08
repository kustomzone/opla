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

'use client';

import { MenuItem } from '@/types';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function AlertDialog({
  id,
  title,
  visible,
  children,
  actions,
  onAction,
  onClose,
  data,
}: {
  id: string;
  title: string;
  visible: boolean;
  children: React.ReactNode;
  actions?: MenuItem[];
  onAction?: (action: string, data: any) => void;
  onClose?: (data: any) => void;
  data?: any;
}) {
  const onPreAction = (action: string, doAction: (action: string, data: any) => void) => {
    doAction?.(action, data);
    onClose?.(data);
  };

  return (
    <Dialog
      id={id}
      open={visible}
      size="sm"
      onClose={() => {
        onClose?.(data);
      }}
    >
      <div className="flex h-full w-full flex-col gap-3 p-4">
        <DialogHeader>{title}</DialogHeader>
        <DialogContent>{children}</DialogContent>
        <DialogFooter>
          {actions?.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant={action.variant || 'default'}
              onClick={(e) => {
                e.preventDefault();
                onPreAction(
                  action.value || action.label,
                  onAction || (data?.onAction as () => void),
                );
              }}
            >
              {action.label}
            </Button>
          ))}
        </DialogFooter>
      </div>
    </Dialog>
  );
}