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
import { z } from 'zod';

import { APISIX } from '@/types/schema/apisix';

const formFlags = {
  __checksEnabled: z.boolean().optional().default(false),
  __checksPassiveEnabled: z.boolean().optional().default(false),
};

const validateUpstreamTarget = (
  data: {
    nodes?: unknown[] | Record<string, number>;
    service_name?: string;
    discovery_type?: string;
    pass_host?: string;
    upstream_host?: string;
  },
  ctx: z.RefinementCtx
) => {
  const hasNodes = Array.isArray(data.nodes)
    ? data.nodes.length > 0
    : !!data.nodes && Object.keys(data.nodes).length > 0;
  const hasServiceName = !!data.service_name?.trim();
  const hasDiscoveryType = !!data.discovery_type?.trim();

  if (!hasNodes && !(hasServiceName && hasDiscoveryType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'At least one backend source is required (nodes or service discovery)',
      path: ['nodes'],
    });
  }
  if (hasServiceName && !hasDiscoveryType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Discovery Type is required when Service Name is set',
      path: ['discovery_type'],
    });
  }
  if (hasDiscoveryType && !hasServiceName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Service Name is required when Discovery Type is set',
      path: ['service_name'],
    });
  }
  if (data.pass_host === 'rewrite' && !data.upstream_host?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Upstream Host is required when Pass Host is rewrite',
      path: ['upstream_host'],
    });
  }
};

export const UpstreamPostSchema = APISIX.Upstream.extend({
  id: z.string().optional(),
})
  .extend(formFlags)
  .superRefine(validateUpstreamTarget);

// We don't omit id here, as we need it for detail view.
export const FormPartUpstreamSchema = APISIX.Upstream.extend(
  formFlags
).superRefine(validateUpstreamTarget);

export type FormPartUpstreamType = z.infer<typeof FormPartUpstreamSchema>;
