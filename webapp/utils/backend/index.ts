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

import { Provider } from '@/types';
import { BackendResponse } from '@/utils/backend/start';
import { BackendStatus } from '../../types/backend';

const init = async (oplaConfiguration: Provider, listener: (payload: any) => void) => {
  // eslint-disable-next-line no-underscore-dangle
  if (window?.__TAURI__) {
    const { default: start } = await import('@/utils/backend/start');
    return start(oplaConfiguration, listener);
  }
  return { payload: { status: BackendStatus.ERROR, message: 'no backend' } } as BackendResponse;
};

export default init;
