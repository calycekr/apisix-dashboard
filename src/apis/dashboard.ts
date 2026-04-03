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

const RESOURCES = [
  { key: 'routes', api: API_ROUTES, labelKey: 'sources.routes', detailPrefix: '/routes/detail' },
  { key: 'services', api: API_SERVICES, labelKey: 'sources.services', detailPrefix: '/services/detail' },
  { key: 'upstreams', api: API_UPSTREAMS, labelKey: 'sources.upstreams', detailPrefix: '/upstreams/detail' },
  { key: 'consumers', api: API_CONSUMERS, labelKey: 'sources.consumers', detailPrefix: '/consumers/detail' },
  { key: 'ssls', api: API_SSLS, labelKey: 'sources.ssls', detailPrefix: '/ssls/detail' },
  { key: 'streamRoutes', api: API_STREAM_ROUTES, labelKey: 'sources.streamRoutes', detailPrefix: '/stream_routes/detail' },
  { key: 'consumerGroups', api: API_CONSUMER_GROUPS, labelKey: 'sources.consumerGroups', detailPrefix: '/consumer_groups/detail' },
  { key: 'globalRules', api: API_GLOBAL_RULES, labelKey: 'sources.globalRules', detailPrefix: '/global_rules/detail' },
  { key: 'pluginConfigs', api: API_PLUGIN_CONFIGS, labelKey: 'sources.pluginConfigs', detailPrefix: '/plugin_configs/detail' },
  { key: 'secrets', api: API_SECRETS, labelKey: 'sources.secrets', detailPrefix: '/secrets/detail' },
  { key: 'protos', api: API_PROTOS, labelKey: 'sources.protos', detailPrefix: '/protos/detail' },
] as const;

export type ResourceCounts = Record<string, number>;

export type RecentItem = {
  resourceType: string;
  id: string;
  name?: string;
  updateTime: number;
  detailPath: string;
};

export type DashboardData = {
  counts: ResourceCounts;
  recentChanges: RecentItem[];
};

/**
 * Single pass: one API call per resource (page_size=10) gives both
 * the total count (via response.total) and recent items (via response.list).
 * This halves the number of API calls compared to separate count + recent calls.
 */
export const getDashboardData = async (): Promise<DashboardData> => {
  const results = await Promise.allSettled(
    RESOURCES.map((r) =>
      req
        .get(r.api, {
          params: { page: 1, page_size: 10 },
          headers: { [SKIP_INTERCEPTOR_HEADER]: ['400', '404'] },
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

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { key, detailPrefix, total, list } = result.value;
    counts[key] = total;
    for (const item of list) {
      const v = item.value;
      if (!v?.update_time) continue;
      const id = v.id || v.username || '';
      items.push({
        resourceType: key,
        id,
        name: v.name || v.desc || undefined,
        updateTime: v.update_time,
        detailPath: `${detailPrefix}/${id}`,
      });
    }
  }

  return {
    counts,
    recentChanges: items.sort((a, b) => b.updateTime - a.updateTime).slice(0, 10),
  };
};

export { RESOURCES };
