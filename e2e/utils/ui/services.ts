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
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { APISIXType } from '@/types/schema/apisix';

import type { Test } from '../test';
import { uiSelectByLabel } from '.';
import {
  uiCheckUpstreamAllFields,
  uiFillUpstreamAllFields,
  uiOpenInlineUpstream,
} from './upstreams';

/**
 * Fill the service form with required fields
 * Note: Services have no strictly required fields, but name is commonly used
 */
export async function uiFillServiceRequiredFields(
  ctx: Page | Locator,
  service: Partial<APISIXType['Service']>
) {
  // Fill in the Service Name field (not the upstream name)
  // Use a more specific selector to avoid conflicts with upstream.name
  const nameField = ctx.locator('input[name="name"]');
  await nameField.fill(service.name);
}

export async function uiCheckServiceRequiredFields(
  ctx: Page | Locator,
  service: Partial<APISIXType['Service']>
) {
  // Verify the service name (not the upstream name)
  const name = ctx.locator('input[name="name"]');
  await expect(name).toHaveValue(service.name);
}

export async function uiFillServiceAllFields(
  test: Test,
  ctx: Page | Locator,
  service: Partial<APISIXType['Service']>
) {
  await test.step('fill in basic fields', async () => {
    // 1. Name - use first() to get service name, not upstream name
    await ctx.locator('input[name="name"]').fill(service.name);

    // 2. Description - use first() to get service description, not upstream description
    await ctx.getByLabel('Description').first().fill(service.desc);

    // 3. Labels - use placeholder to get service labels field, not upstream labels
    await uiSelectByLabel(ctx as Page, 'Labels', 'env:production');
    await uiSelectByLabel(ctx as Page, 'Labels', 'version:v1');
  });

  await test.step('fill in upstream configuration', async () => {
    await uiOpenInlineUpstream(ctx);
    await uiFillUpstreamAllFields(
      test,
      ctx.getByRole('group', { name: 'Inline Upstream target' }),
      {
        name: 'service-inline-upstream',
        desc: 'Inline upstream for service all fields',
      },
      ctx as Page
    );
  });

  await test.step('fill in additional fields', async () => {
    const settingsGroup = ctx
      .getByRole('group')
      .filter({ has: ctx.getByText('Enable WebSocket', { exact: true }) })
      .last();

    // 5. Enable WebSocket
    const websocketSwitch = settingsGroup.getByRole('switch').first();
    await websocketSwitch.click();
    await expect(websocketSwitch).toBeChecked();

    // 6. Hosts
    const hostsField = settingsGroup.getByRole('combobox', { name: 'Hosts' });
    await expect(hostsField).toBeEnabled();
    await hostsField.click();
    await hostsField.fill('api.example.com');
    await hostsField.press('Enter');
    await hostsField.fill('www.example.com');
    await hostsField.press('Enter');
    await expect(hostsField).toHaveValue('');
  });
}

export async function uiCheckServiceAllFields(
  ctx: Page | Locator,
  service: Partial<APISIXType['Service']>
) {
  // Verify basic information - use first() to get service name, not upstream name
  const name = (ctx as Page).getByRole('textbox', { name: 'Name' }).first();
  await expect(name).toHaveValue(service.name);

  const descriptionField = ctx.getByLabel('Description').first();
  await expect(descriptionField).toHaveValue(service.desc);

  // Verify labels
  await expect(ctx.getByText('env:production')).toBeVisible();
  await expect(ctx.getByText('version:v1')).toBeVisible();

  await uiCheckUpstreamAllFields(
    ctx.getByRole('group', { name: 'Inline Upstream target' }),
    {
      name: 'service-inline-upstream',
      desc: 'Inline upstream for service all fields',
    }
  );

  // Verify WebSocket is enabled
  const websocketSwitch = ctx
    .getByRole('group')
    .filter({ has: ctx.getByText('Enable WebSocket', { exact: true }) })
    .last()
    .getByRole('switch')
    .first();
  await expect(websocketSwitch).toBeChecked();

  // Verify hosts
  await expect(ctx.getByText('api.example.com')).toBeVisible();
  await expect(ctx.getByText('www.example.com')).toBeVisible();
}
