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
import { v4 as uuid } from 'uuid';
import { BaseRecord, BaseNamedRecord, Entity, Resource, Content } from '@/types';

const createBaseRecord = () => {
  const item: BaseRecord = {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return item;
};

const updateRecord = (item: BaseRecord) => ({
  ...item,
  updatedAt: Date.now(),
});

const createBaseNamedRecord = (name: string, description?: string) => {
  const item: BaseNamedRecord = {
    ...createBaseRecord(),
    name,
  };
  if (description) {
    item.description = description;
  }
  return item;
};

const deepCopy = (obj: any) =>
  window?.structuredClone ? window.structuredClone(obj) : JSON.parse(JSON.stringify(obj));

const deepMerge = (_target: any, source: any, copy = false) => {
  const target = copy ? deepCopy(_target) : _target;
  Object.keys(source).forEach((key: string) => {
    const value = source[key];
    if (value !== null && typeof value === 'object') {
      if (typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target;
};

const deepSet = (obj: any, path: string, _value: any, root = path): any => {
  const [property, ...properties] = path.split('.');
  let value = _value;
  if (properties.length) {
    value = deepSet(obj[property] || {}, properties.join('.'), _value, root);
  }
  if (typeof obj !== 'object') {
    throw new Error(`Path '${root}' is not accessible`);
  }
  return { ...obj, [property]: value };
};

const deepGet = (obj: any, path: string, defaultValue?: any, root = path): any => {
  const [property, ...properties] = path.split('.');
  if (properties.length) {
    return deepGet(obj[property], properties.join('.'), root);
  }
  if (typeof obj !== 'object' || property in obj === false) {
    return defaultValue;
  }
  return obj[property];
};

// Inspiration: https://github.com/rayepps/radash/blob/31c1397437d7fb7a78e97499c8d46f992c49844c/src/object.ts

export const mapKeys = <TValue>(
  value: TValue | any,
  mapFunc: (key: string, value: TValue) => string,
): TValue => {
  if (Array.isArray(value)) {
    return value.map((item) => mapKeys(item, mapFunc)) as TValue;
  }
  if (!value || typeof value !== 'object') return value as TValue;
  const record = value as Record<string, TValue>;
  const keys = Object.keys(record) as string[];
  return keys.reduce(
    (acc, key) => {
      let v = record[key];
      if (Array.isArray(value) || typeof v === 'object') {
        v = mapKeys(v, mapFunc);
      }
      acc[mapFunc(key, v)] = v;
      return acc;
    },
    {} as Record<string, TValue>,
  ) as TValue;
};

const getEntityName = (entity: string | Entity | undefined) =>
  ((entity as Entity)?.name || entity || '') as string;

const getResourceUrl = (resource: string | Resource | undefined) =>
  ((resource as Resource)?.url || resource || '') as string;

const getContent = (content: string | Content | undefined) =>
  ((content as Content)?.parts?.join('\n') || content || '') as string;

export {
  createBaseRecord,
  createBaseNamedRecord,
  updateRecord,
  deepCopy,
  deepGet,
  deepMerge,
  deepSet,
  getEntityName,
  getResourceUrl,
  getContent,
};
