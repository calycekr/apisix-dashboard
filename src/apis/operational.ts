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
import { getRouteListReq } from '@/apis/routes';
import { getSSLListReq } from '@/apis/ssls';
import { getUpstreamListReq } from '@/apis/upstreams';
import { req } from '@/config/req';

export type OperationalAlerts = {
  expiringSSLs: Array<{ id: string; sni: string; daysLeft: number; expiryDate: string }>;
  disabledRoutes: Array<{ id: string; name?: string; uri?: string }>;
  upstreamsWithHealthCheck: Array<{ id: string; name?: string; hasChecks: boolean }>;
};

export async function getOperationalAlerts(): Promise<OperationalAlerts> {
  const [sslRes, routeRes, upstreamRes] = await Promise.allSettled([
    getSSLListReq(req, { page: 1, page_size: 100 }),
    getRouteListReq(req, { page: 1, page_size: 100 }),
    getUpstreamListReq(req, { page: 1, page_size: 100 }),
  ]);

  const alerts: OperationalAlerts = {
    expiringSSLs: [],
    disabledRoutes: [],
    upstreamsWithHealthCheck: [],
  };

  // Check SSLs expiring within 30 days
  if (sslRes.status === 'fulfilled') {
    const now = Date.now();
    for (const item of sslRes.value.list) {
      const v = item.value as Record<string, unknown>;
      const validityEnd = v.validity_end as number | undefined;
      if (!validityEnd) continue;
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
    alerts.expiringSSLs.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  // Check disabled routes
  if (routeRes.status === 'fulfilled') {
    for (const item of routeRes.value.list) {
      if (item.value.status === 0) {
        alerts.disabledRoutes.push({
          id: item.value.id,
          name: item.value.name,
          uri: item.value.uri || item.value.uris?.join(', '),
        });
      }
    }
  }

  // Check upstreams with health checks configured
  if (upstreamRes.status === 'fulfilled') {
    for (const item of upstreamRes.value.list) {
      const hasChecks = !!(item.value.checks?.active || item.value.checks?.passive);
      if (hasChecks) {
        alerts.upstreamsWithHealthCheck.push({
          id: item.value.id,
          name: item.value.name,
          hasChecks: true,
        });
      }
    }
  }

  return alerts;
}
