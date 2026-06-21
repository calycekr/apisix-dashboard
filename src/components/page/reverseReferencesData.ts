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
import { useQuery } from '@tanstack/react-query';

import { fetchAllResources } from '@/apis/fetchAll';
import { getRouteListReq } from '@/apis/routes';
import { getServiceListReq } from '@/apis/services';
import { getStreamRouteListReq } from '@/apis/stream_routes';
import type { APISIXType } from '@/types/schema/apisix';

export type ReferenceResourceType = 'upstream' | 'service';

export type Reference = {
  type: string;
  id: string;
  name?: string;
  detailPath: string;
};

const getReverseReferences = async (
  resourceType: ReferenceResourceType,
  resourceId: string
) => {
  const refs: Reference[] = [];

  if (resourceType === 'upstream') {
    const [routes, services, streamRoutes] = await Promise.all([
      fetchAllResources<APISIXType['Route']>(getRouteListReq),
      fetchAllResources<APISIXType['Service']>(getServiceListReq),
      fetchAllResources<APISIXType['StreamRoute']>(getStreamRouteListReq),
    ]);
    for (const route of routes) {
      if (String(route.upstream_id) === String(resourceId)) {
        refs.push({
          type: 'Route',
          id: route.id,
          name: route.name,
          detailPath: `/routes/detail/${route.id}`,
        });
      }
    }
    for (const service of services) {
      if (String(service.upstream_id) === String(resourceId)) {
        refs.push({
          type: 'Service',
          id: service.id,
          name: service.name,
          detailPath: `/services/detail/${service.id}`,
        });
      }
    }
    for (const streamRoute of streamRoutes) {
      if (String(streamRoute.upstream_id) === String(resourceId)) {
        refs.push({
          type: 'Stream Route',
          id: streamRoute.id,
          detailPath: `/stream_routes/detail/${streamRoute.id}`,
        });
      }
    }
  } else {
    const [routes, streamRoutes] = await Promise.all([
      fetchAllResources<APISIXType['Route']>(getRouteListReq),
      fetchAllResources<APISIXType['StreamRoute']>(getStreamRouteListReq),
    ]);
    for (const route of routes) {
      if (String(route.service_id) === String(resourceId)) {
        refs.push({
          type: 'Route',
          id: route.id,
          name: route.name,
          detailPath: `/routes/detail/${route.id}`,
        });
      }
    }
    for (const streamRoute of streamRoutes) {
      if (String(streamRoute.service_id) === String(resourceId)) {
        refs.push({
          type: 'Stream Route',
          id: streamRoute.id,
          detailPath: `/stream_routes/detail/${streamRoute.id}`,
        });
      }
    }
  }

  return refs;
};

export const useReverseReferences = (
  resourceType: ReferenceResourceType,
  resourceId: string,
  enabled = true
) =>
  useQuery({
    queryKey: ['reverse-references', resourceType, resourceId],
    queryFn: () => getReverseReferences(resourceType, resourceId),
    enabled: enabled && resourceId.length > 0,
    staleTime: 120_000,
  });
