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
import { useRouter } from 'next/router';
import { DownloadCloud, AlertTriangle, Server, BarChart3 } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
import logger from '@/utils/logger';
import { useContext } from 'react';
import { AppContext } from '@/context';

export default function Statusbar() {
  const router = useRouter();
  const { t } = useTranslation();
  const { backendContext } = useBackend();
  const { usage } = useContext(AppContext);

  logger.info('statusbar backendContext', backendContext);

  const running = backendContext.server.status === 'started';
  const error = backendContext.server.status === 'error';

  const download = (backendContext.downloads ?? [undefined])[0];

  const displayServer = () => {
    router.push(`/providers`);
  };

  const { activeModel } = backendContext.config.models;

  return (
    <div className="m-0 flex w-full flex-row justify-between gap-4 bg-orange-300 px-2 py-1 text-xs dark:bg-orange-500">
      <div className="flex flex-row items-center">
        <button
          className="flex flex-row items-center justify-center gap-1"
          type="button"
          onClick={displayServer}
        >
          {!error && (
            <span className={`${running ? 'text-green-500' : 'text-gray-500'} `}>
              <Server className="h-4 w-4" />
            </span>
          )}
          {error && (
            <span className="text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          )}
          {(backendContext.server.status === 'init' ||
            backendContext.server.status === 'wait' ||
            backendContext.server.status === 'starting') && <span>{t('Server is starting')}</span>}
          {backendContext.server.status === 'started' && <span>{activeModel}</span>}
          {(backendContext.server.status === 'stopping' ||
            backendContext.server.status === 'stopped') && <span>{t('Server is stopped')}</span>}
          {backendContext.server.status === 'error' && (
            <span className="text-red-600">{t('Server error')}</span>
          )}
        </button>
        {download && (
          <div className="flex flex-row items-center justify-center gap-1">
            <span className="text-neutral-800 dark:text-neutral-300">
              <DownloadCloud className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span>
              <span>{download.fileName} </span>
              <span>{download.percentage} %</span>
            </span>
          </div>
        )}
      </div>
      {usage && (
        <div className="flex flex-row items-center justify-center gap-1">
          <span className="text-neutral-800 dark:text-neutral-300">
            <BarChart3 className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span>
            {usage?.totalTokens ? (
              <span>
                {usage.totalTokens} tokens {usage?.totalMs ? '| ' : ''}
              </span>
            ) : (
              <span> </span>
            )}
            {usage?.totalMs ? (
              <span>
                {String(Math.round(usage.totalMs / 100) / 10)} sec{' '}
                {usage?.totalPerSecond ? '| ' : ''}
              </span>
            ) : (
              <span> </span>
            )}
            {usage?.totalPerSecond ? (
              <span>{String(Math.round(usage.totalPerSecond * 10) / 10)} tokens/sec</span>
            ) : (
              <span> </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
