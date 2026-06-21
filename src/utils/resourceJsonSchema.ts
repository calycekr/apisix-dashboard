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
import type { RefinementCtx, ZodTypeAny } from 'zod';

import { APISIX } from '@/types/schema/apisix';

export type ConditionalRequirement = {
  fieldGroups: string[][];
  description: string;
  condition?: {
    field: string;
    value?: string;
  };
};

const hasRouteUri = (data: { uri?: string; uris?: string[] }) =>
  !!data.uri?.trim() || !!data.uris?.some((uri) => uri.trim());

const validateUpstreamTarget = (
  data: {
    nodes?: unknown[] | Record<string, number>;
    service_name?: string;
    discovery_type?: string;
    pass_host?: string;
    upstream_host?: string;
  },
  context: RefinementCtx
) => {
  const hasNodes = Array.isArray(data.nodes)
    ? data.nodes.length > 0
    : !!data.nodes && Object.keys(data.nodes).length > 0;
  const hasServiceName = !!data.service_name?.trim();
  const hasDiscoveryType = !!data.discovery_type?.trim();

  if (!hasNodes && !(hasServiceName && hasDiscoveryType)) {
    context.addIssue({
      code: 'custom',
      message: 'At least one backend source is required (nodes or service discovery)',
      path: ['nodes'],
    });
  }
  if (hasServiceName !== hasDiscoveryType) {
    context.addIssue({
      code: 'custom',
      message: 'Service Name and Discovery Type must be configured together',
      path: [hasServiceName ? 'discovery_type' : 'service_name'],
    });
  }
  if (data.pass_host === 'rewrite' && !data.upstream_host?.trim()) {
    context.addIssue({
      code: 'custom',
      message: 'Upstream Host is required when Pass Host is rewrite',
      path: ['upstream_host'],
    });
  }
};

export const getAdminResourceSchema = (apiPath: string): ZodTypeAny | null => {
  const normalized = apiPath.toLowerCase();
  if (normalized.match(/^\/consumers\/[^/]+\/credentials(?:\/|$)/)) {
    return APISIX.Credential;
  }
  if (normalized.includes('/stream_routes')) return APISIX.StreamRoute;
  if (normalized.includes('/routes')) {
    return APISIX.Route.refine(hasRouteUri, {
      message: 'At least one request URI is required (uri or uris)',
      path: ['uri'],
    });
  }
  if (normalized.includes('/services')) return APISIX.Service;
  if (normalized.includes('/upstreams')) {
    return APISIX.Upstream.superRefine(validateUpstreamTarget);
  }
  if (normalized.includes('/ssls')) return APISIX.SSL;
  if (normalized.includes('/consumer_groups')) return APISIX.ConsumerGroup;
  if (normalized.includes('/consumers')) return APISIX.Consumer;
  if (normalized.includes('/global_rules')) return APISIX.GlobalRule;
  if (normalized.includes('/plugin_configs')) return APISIX.PluginConfig;
  if (normalized.includes('/plugin_metadata')) return APISIX.PluginMetadata;
  if (normalized.includes('/secrets')) return APISIX.Secret;
  if (normalized.includes('/protos')) return APISIX.Proto;
  return null;
};

export const getResourceIdentityPaths = (apiPath: string) => {
  const normalized = apiPath.toLowerCase();
  if (normalized.match(/^\/consumers\/[^/]+\/credentials(?:\/|$)/)) return ['id'];
  if (normalized.includes('/consumers')) return ['username'];
  if (normalized.includes('/secrets')) return ['manager', 'id'];
  return ['id'];
};

export const getResourceConditionalRequirements = (
  apiPath: string
): ConditionalRequirement[] => {
  const normalized = apiPath.toLowerCase();
  if (normalized.includes('/routes') && !normalized.includes('/stream_routes')) {
    return [
      {
        fieldGroups: [['uri'], ['uris']],
        description: 'One is required. A list value must not be empty.',
      },
      {
        fieldGroups: [['host'], ['hosts']],
        description: 'These fields are mutually exclusive.',
      },
      {
        fieldGroups: [['remote_addr'], ['remote_addrs']],
        description: 'These fields are mutually exclusive.',
      },
    ];
  }
  if (normalized.includes('/upstreams')) {
    return [
      {
        fieldGroups: [['nodes'], ['service_name', 'discovery_type']],
        description: 'Select one backend source.',
      },
      {
        fieldGroups: [['upstream_host']],
        condition: { field: 'pass_host', value: 'rewrite' },
        description: 'Required.',
      },
    ];
  }
  if (normalized.includes('/services')) {
    return [
      {
        fieldGroups: [['upstream'], ['upstream_id']],
        description: 'Optional. A Service may contain plugins only.',
      },
    ];
  }
  return [];
};
