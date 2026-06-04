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
import type { APISIXType } from '@/types/schema/apisix';

/**
 * Checks all dependent resources that reference the given resource by ID.
 * Uses fetchAllResources to correctly paginate through all pages, avoiding
 * silent truncation from bare GET requests without pagination params.
 *
 * @param resourceName - 'Upstream' | 'Service'
 * @param id - the resource ID to check
 * @returns array of human-readable labels for affected dependent resources
 */
export async function checkDependencies(resourceName: string, id: string): Promise<string[]> {
  const affected: string[] = [];

  if (resourceName === 'Upstream') {
    // Check routes referencing this upstream
    try {
      const routes = await fetchAllResources<APISIXType['Route']>(getRouteListReq);
      for (const route of routes) {
        if (route.upstream_id === id) {
          affected.push(`Route: ${route.name || route.id}`);
        }
      }
    } catch {
      // Ignore fetch errors — dependency check is best-effort
    }

    // Check services referencing this upstream
    try {
      const services = await fetchAllResources<APISIXType['Service']>(getServiceListReq);
      for (const service of services) {
        if (service.upstream_id === id) {
          affected.push(`Service: ${service.name || service.id}`);
        }
      }
    } catch {
      // Ignore fetch errors — dependency check is best-effort
    }
  } else if (resourceName === 'Service') {
    // Check routes referencing this service
    try {
      const routes = await fetchAllResources<APISIXType['Route']>(getRouteListReq);
      for (const route of routes) {
        if (route.service_id === id) {
          affected.push(`Route: ${route.name || route.id}`);
        }
      }
    } catch {
      // Ignore fetch errors — dependency check is best-effort
    }
  }

  return affected;
}
