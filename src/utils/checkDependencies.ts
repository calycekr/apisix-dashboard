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
import { fetchAllResources } from '@/apis/fetchAll';
import { getRouteListReq } from '@/apis/routes';
import { getServiceListReq } from '@/apis/services';
import { getStreamRouteListReq } from '@/apis/stream_routes';
import type { APISIXType } from '@/types/schema/apisix';

type DependencyResourceName = 'Upstream' | 'Service';

export async function checkDependencies(
  resourceName: string,
  id: string
): Promise<string[]> {
  if (resourceName !== 'Upstream' && resourceName !== 'Service') return [];
  const affectedById = await checkDependenciesForIds(resourceName, [id]);
  return affectedById[id] ?? [];
}

export async function checkDependenciesForIds(
  resourceName: DependencyResourceName,
  ids: string[]
): Promise<Record<string, string[]>> {
  const affectedById = Object.fromEntries(
    ids.map((id) => [id, [] as string[]])
  );
  const idSet = new Set(ids);

  if (idSet.size === 0) return affectedById;

  if (resourceName === 'Upstream') {
    const [routes, services, streamRoutes] = await Promise.all([
      fetchAllResources<APISIXType['Route']>(getRouteListReq),
      fetchAllResources<APISIXType['Service']>(getServiceListReq),
      fetchAllResources<APISIXType['StreamRoute']>(getStreamRouteListReq),
    ]);

    for (const route of routes) {
      if (route.upstream_id && idSet.has(route.upstream_id)) {
        affectedById[route.upstream_id].push(
          `Route: ${route.name || route.id}`
        );
      }
    }
    for (const service of services) {
      if (service.upstream_id && idSet.has(service.upstream_id)) {
        affectedById[service.upstream_id].push(
          `Service: ${service.name || service.id}`
        );
      }
    }
    for (const streamRoute of streamRoutes) {
      if (streamRoute.upstream_id && idSet.has(streamRoute.upstream_id)) {
        affectedById[streamRoute.upstream_id].push(
          `Stream Route: ${streamRoute.id}`
        );
      }
    }
  } else {
    const [routes, streamRoutes] = await Promise.all([
      fetchAllResources<APISIXType['Route']>(getRouteListReq),
      fetchAllResources<APISIXType['StreamRoute']>(getStreamRouteListReq),
    ]);

    for (const route of routes) {
      if (route.service_id && idSet.has(route.service_id)) {
        affectedById[route.service_id].push(
          `Route: ${route.name || route.id}`
        );
      }
    }
    for (const streamRoute of streamRoutes) {
      if (streamRoute.service_id && idSet.has(streamRoute.service_id)) {
        affectedById[streamRoute.service_id].push(
          `Stream Route: ${streamRoute.id}`
        );
      }
    }
  }

  return affectedById;
}
