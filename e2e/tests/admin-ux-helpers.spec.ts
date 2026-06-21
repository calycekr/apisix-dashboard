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
  restorePatchReadonlyFields,
  stripPatchReadonlyFields,
} from '@/utils/apisixEditable';
import {
  getAdminResourceSchema,
  getResourceConditionalRequirements,
  getResourceIdentityPaths,
} from '@/utils/resourceJsonSchema';

test('uses one resource schema standard across raw JSON surfaces', () => {
  expect(getResourceIdentityPaths('/consumers/alice')).toEqual(['username']);
  expect(getResourceIdentityPaths('/secrets/vault/demo')).toEqual(['manager', 'id']);

  const routeSchema = getAdminResourceSchema('/routes/example');
  const route = {
    id: 'example',
    create_time: 1,
    update_time: 1,
  };

  expect(routeSchema?.safeParse(route).success).toBe(false);
  expect(routeSchema?.safeParse({ ...route, uri: '/' }).success).toBe(true);

  expect(getResourceConditionalRequirements('/routes/example')[0]?.fieldGroups)
    .toEqual([['uri'], ['uris']]);
});

test('keeps resource identity outside editable raw JSON', () => {
  const resource = {
    id: 'route-1',
    create_time: 1,
    update_time: 2,
    uri: '/demo',
  };

  expect(stripPatchReadonlyFields(resource)).toEqual({ uri: '/demo' });
  expect(restorePatchReadonlyFields({ uri: '/updated' }, resource)).toEqual({
    id: 'route-1',
    create_time: 1,
    update_time: 2,
    uri: '/updated',
  });
});
