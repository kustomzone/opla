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

'use client';

export default function SettingItem({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bb-1 flex w-full flex-row items-center border-b border-neutral-100 pb-4 pt-3 dark:border-neutral-800">
      <div className="flex flex-1 flex-col justify-center">
        <p className=" ">{title}</p>
        <p className="text-sm text-neutral-400">{subtitle}</p>
      </div>
      <div className="flex flex-row ">{children}</div>
    </div>
  );
}