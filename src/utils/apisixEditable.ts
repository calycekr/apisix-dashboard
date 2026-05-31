/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export const SYSTEM_READONLY_KEYS = ['id', 'manager', 'create_time', 'update_time'] as const;
export const PATCH_READONLY_KEYS = [...SYSTEM_READONLY_KEYS, 'username'] as const;

export const stripSystemReadonlyFields = <T extends Record<string, unknown>>(data: T): T => {
  const copy = { ...data };
  SYSTEM_READONLY_KEYS.forEach((key) => {
    delete copy[key];
  });
  return copy;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const buildPatchPayload = (
  current: Record<string, unknown>,
  previous: Record<string, unknown>,
  depth = 0
): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(current), ...Object.keys(previous)]);

  for (const key of keys) {
    if (depth === 0 && PATCH_READONLY_KEYS.includes(key as (typeof PATCH_READONLY_KEYS)[number])) {
      continue;
    }

    if (!(key in current)) {
      patch[key] = null;
      continue;
    }

    if (!(key in previous)) {
      patch[key] = current[key];
      continue;
    }

    const currentValue = current[key];
    const previousValue = previous[key];

    if (isRecord(currentValue) && isRecord(previousValue)) {
      const nestedPatch = buildPatchPayload(currentValue, previousValue, depth + 1);
      if (Object.keys(nestedPatch).length > 0) {
        patch[key] = nestedPatch;
      }
      continue;
    }

    if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
      patch[key] = currentValue;
    }
  }

  return patch;
};

export const getChangedTopLevelReadonlyKeys = (
  current: Record<string, unknown>,
  previous: Record<string, unknown>
) =>
  PATCH_READONLY_KEYS.filter((key) => {
    if (!(key in current) && !(key in previous)) return false;
    return JSON.stringify(current[key]) !== JSON.stringify(previous[key]);
  });
