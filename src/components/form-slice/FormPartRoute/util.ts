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
import { produce } from 'immer';

import { produceRmUpstreamWhenHas } from '@/utils/form-producer';
import { pipeProduce } from '@/utils/producer';

import type { RoutePostType, RoutePutType } from './schema';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const compactStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const compacted = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return compacted.length > 0 ? compacted : undefined;
};

const VALID_VARS_OPERATORS = new Set([
  '==', '~=', '>', '>=', '<', '<=',
  '~~', 'in', 'not_in', 'has', 'not_has',
]);

const normalizeVarsValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value : undefined;
  }
  if (value === undefined || value === null) {
    return undefined;
  }
  return value;
};
export const produceVarsToForm = produce((draft: RoutePostType) => {
  if (draft.vars && Array.isArray(draft.vars)) {
    draft.vars = JSON.stringify(draft.vars);
  }
}) as (draft: RoutePostType) => RoutePutType;

export const produceVarsToAPI = produce((draft: RoutePostType) => {
  const d = draft as Record<string, unknown>;

  const optionalStringFields = [
    'uri',
    'host',
    'remote_addr',
    'service_id',
    'upstream_id',
    'plugin_config_id',
    'filter_func',
    'script',
    'script_id',
    'name',
    'desc',
  ];

  optionalStringFields.forEach((field) => {
    const normalized = normalizeString(d[field]);
    if (!normalized && d[field] !== undefined) {
      delete d[field];
      return;
    }
    if (normalized) d[field] = normalized;
  });

  const optionalArrayFields = ['uris', 'hosts', 'remote_addrs', 'methods'];
  optionalArrayFields.forEach((field) => {
    const compacted = compactStringArray(d[field]);
    if (!compacted) {
      delete d[field];
      return;
    }
    d[field] = compacted;
  });

  if (draft.vars && typeof draft.vars === 'string') {
    try {
      const parsed = JSON.parse(draft.vars);
      if (Array.isArray(parsed)) {
        d.vars = parsed
          .filter((item): item is [unknown, unknown, unknown] =>
            Array.isArray(item) && item.length >= 3
          )
          .map(([variable, operator, value]) => {
            const normalizedVariable = normalizeString(variable);
            const normalizedOperator = normalizeString(operator);
            const normalizedValue = normalizeVarsValue(value);

            if (!normalizedVariable || !normalizedOperator || !normalizedValue) {
              return undefined;
            }
            if (!VALID_VARS_OPERATORS.has(normalizedOperator)) {
              return undefined;
            }

            return [normalizedVariable, normalizedOperator, normalizedValue] as [string, string, unknown];
          })
          .filter((item) => item !== undefined) as [string, string, unknown][];
      } else {
        delete draft.vars;
      }
    } catch {
      delete draft.vars;
    }
  }
  if (draft.vars === '' || draft.vars === undefined) {
    delete draft.vars;
  }
  if (Array.isArray(d.vars) && d.vars.length === 0) {
    delete d.vars;
  }

  if (
    d.plugins &&
    typeof d.plugins === 'object' &&
    !Array.isArray(d.plugins) &&
    Object.keys(d.plugins as Record<string, unknown>).length === 0
  ) {
    delete d.plugins;
  }

  if (
    d.timeout &&
    typeof d.timeout === 'object' &&
    !Array.isArray(d.timeout) &&
    Object.keys(d.timeout as Record<string, unknown>).length === 0
  ) {
    delete d.timeout;
  }

  // Enforce mutual exclusivity: prefer singular over plural if both exist
  if (d.uri && d.uris) {
    delete d.uris;
  }
  if (d.host && d.hosts) {
    delete d.hosts;
  }
  if (d.remote_addr && d.remote_addrs) {
    delete d.remote_addrs;
  }
});

export const produceRoute = pipeProduce(
  produceRmUpstreamWhenHas('service_id', 'upstream_id'),
  produceVarsToAPI
);
