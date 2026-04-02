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

export const produceVarsToForm = produce((draft: RoutePostType) => {
  if (draft.vars && Array.isArray(draft.vars)) {
    draft.vars = JSON.stringify(draft.vars);
  }
}) as (draft: RoutePostType) => RoutePutType;

export const produceVarsToAPI = produce((draft: RoutePostType) => {
  if (draft.vars && typeof draft.vars === 'string') {
    try {
      const parsed = JSON.parse(draft.vars);
      if (Array.isArray(parsed)) {
        (draft as Record<string, unknown>).vars = parsed;
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
  if (draft.filter_func === '' || draft.filter_func === undefined) {
    delete draft.filter_func;
  }
  if (draft.script === '' || draft.script === undefined) {
    delete draft.script;
  }
  if (draft.script_id === '' || draft.script_id === undefined) {
    delete draft.script_id;
  }
  // Enforce mutual exclusivity: prefer singular over plural if both exist
  const d = draft as Record<string, unknown>;
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
