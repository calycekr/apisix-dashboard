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
import type { AxiosInstance } from 'axios';

import { getRouteListReq } from '@/apis/routes';
import { getServiceListReq } from '@/apis/services';
import { getStreamRouteListReq } from '@/apis/stream_routes';
import { getUpstreamListReq } from '@/apis/upstreams';
import { req } from '@/config/req';
import type { APISIXType } from '@/types/schema/apisix';

export type TopologyData = {
  routes: Array<{ id: string; name?: string; uri?: string; service_id?: string; upstream_id?: string; hasInlineUpstream: boolean }>;
  streamRoutes: Array<{ id: string; name?: string; service_id?: string; upstream_id?: string; hasInlineUpstream: boolean }>;
  services: Array<{ id: string; name?: string; upstream_id?: string; hasInlineUpstream: boolean }>;
  upstreams: Array<{ id: string; name?: string; nodes: string[] }>;
};

async function fetchAll<T>(
  fetcher: (r: AxiosInstance, params: { page: number; page_size: number }) => Promise<{ list: Array<{ value: T }>; total: number }>,
): Promise<T[]> {
  const first = await fetcher(req, { page: 1, page_size: 100 });
  const items = first.list.map((i) => i.value);
  const totalPages = Math.ceil(first.total / 100);
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetcher(req, { page: i + 2, page_size: 100 })
      )
    );
    for (const page of rest) {
      items.push(...page.list.map((i) => i.value));
    }
  }
  return items;
}

function extractNodes(upstream: APISIXType['Upstream']): string[] {
  const nodes = upstream.nodes;
  if (!nodes) return [];
  if (Array.isArray(nodes)) {
    return nodes.map((n) => `${n.host}:${n.port}`);
  }
  return Object.keys(nodes);
}

export const getTopologyData = async (): Promise<TopologyData> => {
  const [routes, streamRoutes, services, upstreams] = await Promise.all([
    fetchAll<APISIXType['Route']>(getRouteListReq),
    fetchAll<APISIXType['StreamRoute']>(getStreamRouteListReq),
    fetchAll<APISIXType['Service']>(getServiceListReq),
    fetchAll<APISIXType['Upstream']>(getUpstreamListReq),
  ]);

  return {
    routes: routes.map((r) => ({
      id: r.id,
      name: r.name,
      uri: r.uri || r.uris?.join(', '),
      service_id: r.service_id,
      upstream_id: r.upstream_id,
      hasInlineUpstream: !!r.upstream?.nodes,
    })),
    streamRoutes: streamRoutes.map((r) => ({
      id: r.id,
      name: r.desc,
      service_id: r.service_id,
      upstream_id: r.upstream_id,
      hasInlineUpstream: !!r.upstream?.nodes,
    })),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      upstream_id: s.upstream_id,
      hasInlineUpstream: !!s.upstream?.nodes,
    })),
    upstreams: upstreams.map((u) => ({
      id: u.id,
      name: u.name,
      nodes: extractNodes(u),
    })),
  };
};
