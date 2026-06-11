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
import { getCredentialListReq } from '@/apis/credentials';
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
  API_CONFIG_VALIDATE,
  API_CONSUMER_GROUPS,
  API_CONSUMERS,
  API_GLOBAL_RULES,
  API_PLUGIN_CONFIGS,
  API_PLUGIN_METADATA,
  API_PLUGINS,
  API_PROTOS,
  API_ROUTES,
  API_SECRETS,
  API_SERVICES,
  API_SSLS,
  API_STREAM_ROUTES,
  API_UPSTREAMS,
  SKIP_INTERCEPTOR_HEADER,
} from '@/config/constant';
import { req } from '@/config/req';
import type { APISIXType } from '@/types/schema/apisix';

export const EXPORT_VERSION = 2;

export type ExportData = {
  version: number;
  exportedAt: string;
  skippedResources?: string[];
  resources: {
    upstreams: Record<string, unknown>[];
    services: Record<string, unknown>[];
    routes: Record<string, unknown>[];
    streamRoutes: Record<string, unknown>[];
    consumers: Record<string, unknown>[];
    credentials: Record<string, unknown>[];
    consumerGroups: Record<string, unknown>[];
    ssls: Record<string, unknown>[];
    globalRules: Record<string, unknown>[];
    pluginConfigs: Record<string, unknown>[];
    pluginMetadata: Record<string, unknown>[];
    protos: Record<string, unknown>[];
    secrets: Record<string, unknown>[];
  };
};

export type ResourceKey = keyof ExportData['resources'];

export type ConfigValidationError = {
  resource_type?: string;
  resource_id?: string;
  index?: number;
  error: string;
};

export type ConfigValidationResult = {
  valid: boolean;
  errors: ConfigValidationError[];
};

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  upstreams: 'Upstreams',
  services: 'Services',
  routes: 'Routes',
  streamRoutes: 'Stream Routes',
  consumers: 'Consumers',
  credentials: 'Consumer Credentials',
  consumerGroups: 'Consumer Groups',
  ssls: 'SSLs',
  globalRules: 'Global Rules',
  pluginConfigs: 'Plugin Configs',
  pluginMetadata: 'Plugin Metadata',
  protos: 'Protos',
  secrets: 'Secrets',
};

// Import order matters: upstreams before services, services before routes, etc.
export const IMPORT_ORDER: ResourceKey[] = [
  'upstreams',
  'services',
  'consumers',
  'credentials',
  'consumerGroups',
  'ssls',
  'globalRules',
  'pluginConfigs',
  'pluginMetadata',
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
  credentials: '',
  consumerGroups: API_CONSUMER_GROUPS,
  ssls: API_SSLS,
  globalRules: API_GLOBAL_RULES,
  pluginConfigs: API_PLUGIN_CONFIGS,
  pluginMetadata: API_PLUGIN_METADATA,
  protos: API_PROTOS,
  secrets: API_SECRETS,
};

const VALIDATION_RESOURCE_KEYS: Record<ResourceKey, string> = {
  upstreams: 'upstreams',
  services: 'services',
  routes: 'routes',
  streamRoutes: 'stream_routes',
  consumers: 'consumers',
  credentials: 'consumers',
  consumerGroups: 'consumer_groups',
  ssls: 'ssls',
  globalRules: 'global_rules',
  pluginConfigs: 'plugin_configs',
  pluginMetadata: 'plugin_metadata',
  protos: 'protos',
  secrets: 'secrets',
};

function getCredentialValidationItem(
  item: Record<string, unknown>
): Record<string, unknown> {
  const { username, ...credential } = item;
  const id = String(credential.id ?? '');
  return {
    ...credential,
    id: id.includes('/credentials/')
      ? id
      : `${String(username ?? '')}/credentials/${id}`,
  };
}

export const buildConfigValidationPayload = (
  data: ExportData,
  selectedResources: ResourceKey[] = IMPORT_ORDER
): Record<string, Record<string, unknown>[]> => {
  const payload: Record<string, Record<string, unknown>[]> = {};

  for (const resourceType of selectedResources) {
    const key = VALIDATION_RESOURCE_KEYS[resourceType];
    const items = data.resources[resourceType] ?? [];
    const normalizedItems =
      resourceType === 'credentials'
        ? items.map(getCredentialValidationItem)
        : items;
    payload[key] = [...(payload[key] ?? []), ...normalizedItems];
  }

  return payload;
};

export async function validateConfiguration(
  data: ExportData,
  selectedResources: ResourceKey[] = IMPORT_ORDER
): Promise<ConfigValidationResult> {
  try {
    await req.post(
      API_CONFIG_VALIDATE,
      buildConfigValidationPayload(data, selectedResources)
    );
    return { valid: true, errors: [] };
  } catch (error) {
    const responseData = (
      error as {
        response?: {
          data?: {
            errors?: ConfigValidationError[];
            error_msg?: string;
          };
        };
      }
    ).response?.data;
    const errors = responseData?.errors;
    if (Array.isArray(errors)) return { valid: false, errors };

    return {
      valid: false,
      errors: [
        {
          error:
            responseData?.error_msg ??
            (error instanceof Error ? error.message : String(error)),
        },
      ],
    };
  }
}

export async function exportAllResources(): Promise<ExportData> {
  const results = await Promise.allSettled([
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
  const resourceNames: ResourceKey[] = [
    'upstreams', 'services', 'routes', 'streamRoutes', 'consumers',
    'consumerGroups', 'ssls', 'globalRules', 'pluginConfigs', 'protos', 'secrets',
  ];
  const v = (i: number) => results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<Record<string, unknown>[]>).value : [];
  const skipped = resourceNames.filter((_, i) => results[i].status === 'rejected');
  const consumers = v(4);
  const extendedResults = await Promise.allSettled([
    exportCredentials(consumers),
    exportPluginMetadata(),
  ]);
  if (
    extendedResults[0].status === 'rejected' ||
    extendedResults[0].value.hadFailures
  ) {
    skipped.push('credentials');
  }
  if (
    extendedResults[1].status === 'rejected' ||
    extendedResults[1].value.hadFailures
  ) {
    skipped.push('pluginMetadata');
  }
  const credentials =
    extendedResults[0].status === 'fulfilled' ? extendedResults[0].value.items : [];
  const pluginMetadata =
    extendedResults[1].status === 'fulfilled' ? extendedResults[1].value.items : [];

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    skippedResources: skipped,
    resources: {
      upstreams: v(0), services: v(1), routes: v(2), streamRoutes: v(3),
      consumers, credentials, consumerGroups: v(5), ssls: v(6),
      globalRules: v(7), pluginConfigs: v(8), pluginMetadata, protos: v(9),
      secrets: v(10),
    },
  };
}

async function exportCredentials(
  consumers: Record<string, unknown>[]
): Promise<{ items: Record<string, unknown>[]; hadFailures: boolean }> {
  const credentialLists = await Promise.allSettled(
    consumers.map(async (consumer) => {
      const username = String(consumer.username ?? '');
      if (!username) return [];
      const response = await getCredentialListReq(req, { username });
      return response.list.map((credential) => ({ ...credential, username }));
    })
  );
  return {
    items: credentialLists.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    ),
    hadFailures: credentialLists.some((result) => result.status === 'rejected'),
  };
}

async function exportPluginMetadata(): Promise<{
  items: Record<string, unknown>[];
  hadFailures: boolean;
}> {
  const plugins = await req
    .get<unknown, APISIXType['RespPlugins']>(API_PLUGINS, {
      params: { all: true },
    })
    .then((response) => response.data);
  const pluginNames = Object.entries(plugins)
    .filter(([, plugin]) => plugin.metadata_schema)
    .map(([name]) => name);
  const metadata = await Promise.allSettled(
    pluginNames.map(async (name): Promise<Record<string, unknown> | null> => {
      try {
        const response = await req.get<
          unknown,
          APISIXType['RespPluginMetadataDetail']
        >(`${API_PLUGIN_METADATA}/${name}`, {
          headers: {
            [SKIP_INTERCEPTOR_HEADER]: ['404'],
          },
        });
        return { id: name, ...stripTimestamps(response.data.value) };
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response
          ?.status;
        if (status === 404) return null;
        throw error;
      }
    })
  );
  return {
    items: metadata.flatMap((result) =>
      result.status === 'fulfilled' && result.value ? [result.value] : []
    ),
    hadFailures: metadata.some((result) => result.status === 'rejected'),
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
  if (resourceType === 'credentials') return String(item.id ?? '');
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
        if (resourceType === 'credentials') {
          const username = String(item.username ?? '');
          await req.put(`${API_CONSUMERS}/${username}/credentials/${id}`, putBody);
        } else {
          await req.put(`${apiPath}/${id}`, putBody);
        }
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
