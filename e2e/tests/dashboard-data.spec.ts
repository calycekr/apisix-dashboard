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
import { expect, test } from '@playwright/test';

import {
  getResourceDetailPath,
  getResourceId,
  RESOURCES,
} from '@/apis/dashboard';

test('builds dashboard and global search detail links for special resources', () => {
  const secretsResource = RESOURCES.find((resource) => resource.key === 'secrets');
  const pluginMetadataResource = RESOURCES.find((resource) => resource.key === 'pluginMetadata');
  const consumersResource = RESOURCES.find((resource) => resource.key === 'consumers');

  expect(secretsResource).toBeDefined();
  expect(pluginMetadataResource).toBeDefined();
  expect(consumersResource).toBeDefined();

  expect(
    getResourceDetailPath(secretsResource!, {
      manager: 'vault',
      id: 'payment-secret',
    })
  ).toBe('/secrets/detail/vault/payment-secret');
  expect(getResourceId(consumersResource!.key, { username: 'alice' })).toBe('alice');
  expect(
    getResourceDetailPath(pluginMetadataResource!, {
      id: 'batch-requests',
      update_time: 1,
    })
  ).toBe('/plugin_metadata');
});

test('includes plugin metadata in dashboard resource coverage', () => {
  expect(RESOURCES.map((resource) => resource.key)).toContain('pluginMetadata');
});
