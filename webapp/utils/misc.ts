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

export const isMac = () =>
  typeof window !== 'undefined' && window.navigator.platform.toLowerCase().indexOf('mac') > -1;
export const isWindows =
  typeof window !== 'undefined' && window.navigator.platform.toLowerCase().indexOf('win') > -1;

export const getFilename = (path: string) => {
  const p = path.replace(/\\/g, '/');
  return p.split('/').pop();
};

export const fetchJson = () => {
  const abortController = new AbortController();
  const fetchData = async (endpoint: string, options: RequestInit) => {
    const response = await fetch(endpoint, {
      ...options,
      signal: abortController.signal,
    });
    const newData = await response.json();
    return newData;
  };
  return [fetchData, abortController];
};
