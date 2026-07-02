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
import {
  API_CONSUMER_GROUPS,
  API_CONSUMERS,
  API_GLOBAL_RULES,
  API_PLUGIN_CONFIGS,
  API_PLUGIN_METADATA,
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

const OPERATIONAL_PAGE_SIZE = 100;

const RESOURCES = [
  {
    key: 'routes',
    api: API_ROUTES,
    labelKey: 'sources.routes',
    detailPrefix: '/routes/detail',
    pageSize: OPERATIONAL_PAGE_SIZE,
  },
  { key: 'services', api: API_SERVICES, labelKey: 'sources.services', detailPrefix: '/services/detail' },
  {
    key: 'upstreams',
    api: API_UPSTREAMS,
    labelKey: 'sources.upstreams',
    detailPrefix: '/upstreams/detail',
    pageSize: OPERATIONAL_PAGE_SIZE,
  },
  { key: 'consumers', api: API_CONSUMERS, labelKey: 'sources.consumers', detailPrefix: '/consumers/detail' },
  {
    key: 'ssls',
    api: API_SSLS,
    labelKey: 'sources.ssls',
    detailPrefix: '/ssls/detail',
    pageSize: OPERATIONAL_PAGE_SIZE,
  },
  { key: 'streamRoutes', api: API_STREAM_ROUTES, labelKey: 'sources.streamRoutes', detailPrefix: '/stream_routes/detail' },
  { key: 'consumerGroups', api: API_CONSUMER_GROUPS, labelKey: 'sources.consumerGroups', detailPrefix: '/consumer_groups/detail' },
  { key: 'globalRules', api: API_GLOBAL_RULES, labelKey: 'sources.globalRules', detailPrefix: '/global_rules/detail' },
  { key: 'pluginConfigs', api: API_PLUGIN_CONFIGS, labelKey: 'sources.pluginConfigs', detailPrefix: '/plugin_configs/detail' },
  { key: 'pluginMetadata', api: API_PLUGIN_METADATA, labelKey: 'sources.pluginMetadata', detailPrefix: '/plugin_metadata' },
  { key: 'secrets', api: API_SECRETS, labelKey: 'sources.secrets', detailPrefix: '/secrets/detail' },
  { key: 'protos', api: API_PROTOS, labelKey: 'sources.protos', detailPrefix: '/protos/detail' },
] as const;

type DashboardResource = (typeof RESOURCES)[number];

export function getResourceId(
  resourceKey: DashboardResource['key'],
  value: Record<string, unknown>
): string {
  if (resourceKey === 'consumers') return String(value.username ?? value.id ?? '');
  return String(value.id ?? value.username ?? '');
}

export function getResourceDetailPath(
  resource: Pick<DashboardResource, 'key' | 'detailPrefix'>,
  value: Record<string, unknown>
): string {
  const id = getResourceId(resource.key, value);
  if (resource.key === 'secrets') {
    const manager = String(value.manager ?? '');
    return manager && id
      ? `${resource.detailPrefix}/${manager}/${id}`
      : resource.detailPrefix;
  }
  if (resource.key === 'pluginMetadata') return resource.detailPrefix;
  return id ? `${resource.detailPrefix}/${id}` : resource.detailPrefix;
}

export type ResourceCounts = Record<string, number>;

export type RecentItem = {
  resourceType: string;
  id: string;
  name?: string;
  updateTime: number;
  detailPath: string;
};

export type PluginUsage = { name: string; count: number };

export type OperationalAlerts = {
  expiringSSLs: Array<{ id: string; sni: string; daysLeft: number; expiryDate: string }>;
  disabledRoutes: Array<{ id: string; name?: string; uri?: string }>;
  upstreamsWithHealthCheck: Array<{ id: string; name?: string; hasChecks: boolean }>;
  pluginUsage: PluginUsage[];
};

export type DashboardData = {
  counts: ResourceCounts;
  recentChanges: RecentItem[];
  alerts: OperationalAlerts;
  unavailableResources: string[];
};

/**
 * One request per resource provides counts and recent items. Routes, SSLs, and
 * upstreams use the same response to calculate operational alerts as well.
 */
export const getDashboardData = async (): Promise<DashboardData> => {
  const results = await Promise.allSettled(
    RESOURCES.map((r) =>
      req
        .get(r.api, {
          params: { page: 1, page_size: 'pageSize' in r ? r.pageSize : 10 },
          headers: {
            [SKIP_INTERCEPTOR_HEADER]: [
              '400',
              '404',
              '500',
              '503',
              'network',
            ],
          },
        })
        .then((v) => ({
          key: r.key,
          detailPrefix: r.detailPrefix,
          total: v.data?.total ?? 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          list: (v.data?.list ?? []) as Array<{ value: Record<string, any> }>,
        }))
    )
  );

  const counts: ResourceCounts = {};
  const items: RecentItem[] = [];
  const alerts: OperationalAlerts = {
    expiringSSLs: [],
    disabledRoutes: [],
    upstreamsWithHealthCheck: [],
    pluginUsage: [],
  };
  const pluginCounts = new Map<string, number>();
  const unavailableResources: string[] = [];
  const now = Date.now();

  for (const [index, result] of results.entries()) {
    if (result.status !== 'fulfilled') {
      unavailableResources.push(RESOURCES[index].key);
      continue;
    }
    const { key, detailPrefix, total, list } = result.value;
    counts[key] = total;
    for (const item of list) {
      const v = item.value;

      if (key === 'ssls') {
        const validityEnd = v.validity_end as number | undefined;
        if (validityEnd) {
          const expiryMs = validityEnd * 1000;
          const daysLeft = Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000));
          if (daysLeft <= 30) {
            alerts.expiringSSLs.push({
              id: String(v.id),
              sni: String(v.sni || (v.snis as string[] | undefined)?.[0] || 'unknown'),
              daysLeft,
              expiryDate: new Date(expiryMs).toISOString().slice(0, 10),
            });
          }
        }
      }

      if (key === 'routes') {
        if (v.status === 0) {
          alerts.disabledRoutes.push({
            id: String(v.id),
            name: v.name as string | undefined,
            uri: (v.uri as string | undefined) || (v.uris as string[] | undefined)?.join(', '),
          });
        }
        if (v.plugins && typeof v.plugins === 'object') {
          for (const name of Object.keys(v.plugins)) {
            pluginCounts.set(name, (pluginCounts.get(name) ?? 0) + 1);
          }
        }
      }

      if (key === 'upstreams') {
        const checks = v.checks as
          | { active?: unknown; passive?: unknown }
          | undefined;
        if (checks?.active || checks?.passive) {
          alerts.upstreamsWithHealthCheck.push({
            id: String(v.id),
            name: v.name as string | undefined,
            hasChecks: true,
          });
        }
      }

      if (!v?.update_time) continue;
      const id = getResourceId(key, v);
      items.push({
        resourceType: key,
        id,
        name: v.name || v.desc || undefined,
        updateTime: v.update_time,
        detailPath: getResourceDetailPath({ key, detailPrefix }, v),
      });
    }
  }

  alerts.expiringSSLs.sort((a, b) => a.daysLeft - b.daysLeft);
  alerts.pluginUsage = Array.from(pluginCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    counts,
    recentChanges: items.sort((a, b) => b.updateTime - a.updateTime).slice(0, 10),
    alerts,
    unavailableResources,
  };
};

export { RESOURCES };
