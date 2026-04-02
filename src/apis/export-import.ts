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
import { getConsumerGroupListReq } from '@/apis/consumer_groups';
import { getConsumerListReq } from '@/apis/consumers';
import { fetchAllResources } from '@/apis/fetchAll';
import { getGlobalRuleListReq } from '@/apis/global_rules';
import { getPluginConfigListReq } from '@/apis/plugin_configs';
import { getProtoListReq } from '@/apis/protos';
import { getRouteListReq } from '@/apis/routes';
import { getSecretListReq } from '@/apis/secrets';
import { getServiceListReq } from '@/apis/services';
import { getSSLListReq } from '@/apis/ssls';
import { getStreamRouteListReq } from '@/apis/stream_routes';
import { getUpstreamListReq } from '@/apis/upstreams';
import {
  API_CONSUMER_GROUPS,
  API_CONSUMERS,
  API_GLOBAL_RULES,
  API_PLUGIN_CONFIGS,
  API_PROTOS,
  API_ROUTES,
  API_SECRETS,
  API_SERVICES,
  API_SSLS,
  API_STREAM_ROUTES,
  API_UPSTREAMS,
} from '@/config/constant';
import { req } from '@/config/req';

export const EXPORT_VERSION = 1;

export type ExportData = {
  version: number;
  exportedAt: string;
  resources: {
    upstreams: Record<string, unknown>[];
    services: Record<string, unknown>[];
    routes: Record<string, unknown>[];
    streamRoutes: Record<string, unknown>[];
    consumers: Record<string, unknown>[];
    consumerGroups: Record<string, unknown>[];
    ssls: Record<string, unknown>[];
    globalRules: Record<string, unknown>[];
    pluginConfigs: Record<string, unknown>[];
    protos: Record<string, unknown>[];
    secrets: Record<string, unknown>[];
  };
};

export type ResourceKey = keyof ExportData['resources'];

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  upstreams: 'Upstreams',
  services: 'Services',
  routes: 'Routes',
  streamRoutes: 'Stream Routes',
  consumers: 'Consumers',
  consumerGroups: 'Consumer Groups',
  ssls: 'SSLs',
  globalRules: 'Global Rules',
  pluginConfigs: 'Plugin Configs',
  protos: 'Protos',
  secrets: 'Secrets',
};

// Import order matters: upstreams before services, services before routes, etc.
export const IMPORT_ORDER: ResourceKey[] = [
  'upstreams',
  'services',
  'consumers',
  'consumerGroups',
  'ssls',
  'globalRules',
  'pluginConfigs',
  'protos',
  'secrets',
  'routes',
  'streamRoutes',
];

const RESOURCE_API_MAP: Record<ResourceKey, string> = {
  upstreams: API_UPSTREAMS,
  services: API_SERVICES,
  routes: API_ROUTES,
  streamRoutes: API_STREAM_ROUTES,
  consumers: API_CONSUMERS,
  consumerGroups: API_CONSUMER_GROUPS,
  ssls: API_SSLS,
  globalRules: API_GLOBAL_RULES,
  pluginConfigs: API_PLUGIN_CONFIGS,
  protos: API_PROTOS,
  secrets: API_SECRETS,
};

export async function exportAllResources(): Promise<ExportData> {
  const [
    upstreams, services, routes, streamRoutes, consumers,
    consumerGroups, ssls, globalRules, pluginConfigs, protos, secrets,
  ] = await Promise.all([
    fetchAllResources(getUpstreamListReq),
    fetchAllResources(getServiceListReq),
    fetchAllResources(getRouteListReq),
    fetchAllResources(getStreamRouteListReq),
    fetchAllResources(getConsumerListReq),
    fetchAllResources(getConsumerGroupListReq),
    fetchAllResources(getSSLListReq),
    fetchAllResources(getGlobalRuleListReq),
    fetchAllResources(getPluginConfigListReq),
    fetchAllResources(getProtoListReq),
    fetchAllResources(getSecretListReq),
  ]);

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    resources: {
      upstreams, services, routes, streamRoutes, consumers,
      consumerGroups, ssls, globalRules, pluginConfigs, protos, secrets,
    },
  };
}

function stripTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...data };
  delete copy.create_time;
  delete copy.update_time;
  return copy;
}

export type ImportResult = {
  resourceType: ResourceKey;
  total: number;
  success: number;
  errors: Array<{ id: string; error: string }>;
};

function getResourceId(resourceType: ResourceKey, item: Record<string, unknown>): string {
  if (resourceType === 'consumers') return String(item.username ?? item.id ?? '');
  if (resourceType === 'secrets') {
    // secrets have composite IDs like "vault/1"
    const manager = item.manager ?? '';
    const id = item.id ?? '';
    return manager ? `${manager}/${id}` : String(id);
  }
  return String(item.id ?? '');
}

export async function importResources(
  data: ExportData,
  selectedResources: ResourceKey[],
  onProgress?: (result: ImportResult) => void,
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  for (const resourceType of IMPORT_ORDER) {
    if (!selectedResources.includes(resourceType)) continue;

    const items = data.resources[resourceType] ?? [];
    if (items.length === 0) {
      const result: ImportResult = { resourceType, total: 0, success: 0, errors: [] };
      results.push(result);
      onProgress?.(result);
      continue;
    }

    const apiPath = RESOURCE_API_MAP[resourceType];
    const result: ImportResult = { resourceType, total: items.length, success: 0, errors: [] };

    for (const item of items) {
      const id = getResourceId(resourceType, item);
      const body = stripTimestamps(item);

      try {
        // Use PUT with ID to create or update
        const putBody = { ...body };
        delete putBody.id;
        delete putBody.username;
        await req.put(`${apiPath}/${id}`, putBody);
        result.success++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push({ id, error: msg });
      }
    }

    results.push(result);
    onProgress?.(result);
  }

  return results;
}
