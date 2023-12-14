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
import { useContext } from 'react';
import { useRouter } from 'next/router';
import { PiCircleFill, PiCloudArrowDown, PiWarning } from 'react-icons/pi';
import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';

export default function Statusbar() {
  const router = useRouter();
  const { t } = useTranslation();
  const { backend } = useContext(AppContext);
  const running = backend.server.status === 'started';
  const error = backend.server.status === 'error';
  const displayServer = () => {
    router.push(`/providers`);
  };

  return (
    <div className="m-0 flex w-full flex-row gap-4 bg-cyan-300 px-2 py-1 text-xs dark:bg-cyan-700">
      <button
        className="flex flex-row items-center justify-center gap-1"
        type="button"
        onClick={displayServer}
      >
        {!error && (
          <span className={`${running ? 'text-green-500' : 'text-red-500'} `}>
            <PiCircleFill />
          </span>
        )}
        {error && (
          <span className="text-neutral-800 dark:text-neutral-300">
            <PiWarning />
          </span>
        )}
        {(backend.server.status === 'init' ||
          backend.server.status === 'wait' ||
          backend.server.status === 'starting') && <span>{t('Server is starting')}</span>}
        {backend.server.status === 'started' && <span>{t('Server is running')}</span>}
        {(backend.server.status === 'stopping' || backend.server.status === 'stopped') && (
          <span>{t('Server is stopped')}</span>
        )}
        {backend.server.status === 'error' && <span>{t('Server has crashed')}</span>}
      </button>
      <div className="flex flex-row items-center justify-center gap-1">
        <span className="text-neutral-800 dark:text-neutral-300">
          <PiCloudArrowDown />
        </span>
        <span>Zephyr... downloading 10%</span>
      </div>
    </div>
  );
}
