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

import { genTLS } from '../common';
import type { Test } from '../test';

export async function uiOpenInlineUpstream(ctx: Page | Locator) {
  const inlineTarget = ctx.getByText('Define inline Upstream', { exact: true });
  if (await inlineTarget.count()) {
    await inlineTarget.first().click();
  }

  const configureInline = ctx.getByRole('button', {
    name: 'Configure inline',
  });
  if (await configureInline.count()) {
    await configureInline.first().click();
  }
}

const uiSelectByLabelIn = async (
  ctx: Page | Locator,
  page: Page,
  label: string,
  value: string
) => {
  const select = ctx
    .getByRole('combobox', { name: label, exact: true })
    .locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
    )
    .first();
  if ((await select.textContent())?.includes(value)) return;

  const keySteps: Record<string, number> = {
    chash: 1,
    header: 1,
    https: 1,
    rewrite: 2,
  };
  if (value in keySteps) {
    await select.click();
    for (let i = 0; i < keySteps[value]; i += 1) {
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('Enter');
    await expect(select).toContainText(value, { timeout: 10000 });
    await page.keyboard.press('Escape').catch(() => {});
    return;
  }

  await select.click();
  await page.keyboard.type(value);
  const option = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .last()
    .getByRole('option')
    .filter({ hasText: value })
    .first();
  try {
    await expect(option).toBeVisible({ timeout: 3000 });
    await option.click();
  } catch {
    await page.keyboard.press('Enter');
  }
  await expect(select).toContainText(value, { timeout: 10000 });
  await page.keyboard.press('Escape').catch(() => {});
};

const uiConfigureOptionalSection = async (
  ctx: Page | Locator,
  section: string
) => {
  const button = ctx.getByRole('button', { name: `Configure ${section}` });
  if (await button.count()) {
    await button.first().click();
  }
};

/**
 * Fill the upstream form with required fields
 * @param ctx - Playwright page object or locator
 * @param upstreamName - Name for the upstream
 * @param nodes - Array of upstream nodes
 */
export async function uiFillUpstreamRequiredFields(
  ctx: Page | Locator,
  upstream: Partial<APISIXType['Upstream']>
) {
  await uiOpenInlineUpstream(ctx);
  const nodes = upstream.nodes ?? [];

  // Fill in the Name field
  await ctx.getByLabel('Name', { exact: true }).fill(upstream.name);

  // Configure nodes section
  const addNodeBtn = ctx.getByRole('button', { name: 'Add a Node' });

  // Add first node
  await addNodeBtn.click({ force: true });
  const hostInputs = ctx.getByRole('textbox', { name: 'Host', exact: true });
  const portInputs = ctx.getByRole('spinbutton', { name: 'Port', exact: true });
  const weightInputs = ctx.getByRole('spinbutton', { name: 'Weight', exact: true });
  await expect(hostInputs.nth(0)).toBeVisible();
  const firstRowHost = hostInputs.nth(0);
  await firstRowHost.fill(nodes[0].host);
  await expect(firstRowHost).toHaveValue(nodes[0].host);
  await portInputs.nth(0).fill(String(nodes[0].port ?? 80));
  await weightInputs.nth(0).fill(String(nodes[0].weight ?? 100));
  await weightInputs.nth(0).blur();
}

export async function uiCheckUpstreamRequiredFields(
  ctx: Page | Locator,
  upstream: Partial<APISIXType['Upstream']>
) {
  const nodes = upstream.nodes ?? [];

  // Verify the upstream name
  const name = ctx.getByLabel('Name', { exact: true });
  await expect(name).toHaveValue(upstream.name);
  // Verify the upstream nodes
  const hostInputs = ctx.getByRole('textbox', { name: 'Host', exact: true });

  await expect(hostInputs.nth(0)).toHaveValue(nodes[0].host);
}

export async function uiFillUpstreamAllFields(
  test: Test,
  ctx: Page | Locator,
  /**
   * currently only name and desc are useful,
   * because I dont want to change too many fields in upstreams related tests
   */
  upstream: Partial<APISIXType['Upstream']>,
  page: Page = ctx as Page
) {
  await uiOpenInlineUpstream(ctx);

  await test.step('fill in required fields', async () => {
    // Fill in the required fields
    // 1. Name (required)
    await ctx.getByLabel('Name', { exact: true }).fill(upstream.name);

    // 2. Description (optional but simple)
    await ctx.getByLabel('Description').fill(upstream.desc);

    // 3. Add multiple nodes (required)
    const addNodeBtn = ctx.getByRole('button', { name: 'Add a Node' });
    // Add the first node, using force option
    await addNodeBtn.click({ force: true });

    // Wait for table rows to appear
    const hostInputs = ctx.getByRole('textbox', { name: 'Host', exact: true });
    const portInputs = ctx.getByRole('spinbutton', { name: 'Port', exact: true });
    const weightInputs = ctx.getByRole('spinbutton', { name: 'Weight', exact: true });
    const priorityInputs = ctx.getByRole('spinbutton', { name: 'Priority', exact: true });
    await expect(hostInputs.first()).toBeVisible();

    // Fill in the Host for the first node - click first then fill
    const hostInput = hostInputs.first();
    await hostInput.click();
    await hostInput.fill('node1.example.com');
    await expect(hostInput).toHaveValue('node1.example.com');
    await hostInput.blur();

    // Fill in the Port for the first node - click first then fill
    const portInput = portInputs.first();
    await portInput.click();
    await portInput.fill('8080');
    await expect(portInput).toHaveValue('8080');

    // Fill in the Weight for the first node - click first then fill
    const weightInput = weightInputs.first();
    await weightInput.click();
    await weightInput.fill('10');
    await expect(weightInput).toHaveValue('10');

    // Fill in the Priority for the first node - click first then fill
    const priorityInput = priorityInputs.first();
    await priorityInput.click();
    await priorityInput.fill('1');
    await priorityInput.blur();

  });

  await test.step('fill in all optional fields', async () => {
    // Fill in all optional fields

    // 1. Load balancing type - using force option
    await ctx
      .getByRole('combobox', { name: 'Type', exact: true })
      .scrollIntoViewIfNeeded();
    await uiSelectByLabelIn(ctx, page, 'Type', 'chash');

    // 2. Hash On field (only useful when type is chash) - using force option
    await uiSelectByLabelIn(ctx, page, 'Hash On', 'header');

    // 3. Key field (only useful when type is chash)
    await ctx
      .getByRole('textbox', { name: 'Key', exact: true })
      .fill('X-Custom-Header');

    // 4. Set protocol (Scheme) - using force option
    await uiSelectByLabelIn(ctx, page, 'Scheme', 'https');

    // 5. Set retry count (Retries)
    await ctx.getByLabel('Retries').fill('5');

    // 6. Set retry timeout (Retry Timeout)
    await ctx.getByLabel('Retry timeout').fill('6');

    // 7. Pass Host setting - using force option
    await uiSelectByLabelIn(ctx, page, 'Pass Host', 'rewrite');

    // 8. Upstream Host
    await ctx.getByLabel('Upstream Host').fill('custom.upstream.host');

    // 9. Timeout settings
    await uiConfigureOptionalSection(ctx, 'Timeout');
    await ctx.getByLabel('Connect', { exact: true }).fill('3');
    await ctx.getByLabel('Send', { exact: true }).fill('3');
    await ctx.getByLabel('Read', { exact: true }).fill('3');

    // 10. Keepalive Pool settings
    await uiConfigureOptionalSection(ctx, 'Keepalive Pool');
    await ctx.getByLabel('Size', { exact: true }).fill('320');
    await ctx.getByLabel('IDLE Timeout', { exact: true }).fill('60');
    await ctx.getByLabel('Requests', { exact: true }).fill('1000');

    // 11. TLS client verification settings
    await uiConfigureOptionalSection(ctx, 'TLS');
    const tls = await genTLS();
    await ctx
      .getByRole('textbox', { name: 'Client Cert', exact: true })
      .fill(tls.cert);
    await ctx
      .getByRole('textbox', { name: 'Client Key', exact: true })
      .fill(tls.key);
  });
}

export async function uiCheckUpstreamAllFields(
  ctx: Page | Locator,
  upstream: Partial<APISIXType['Upstream']>
) {
  // Verify basic information
  const name = ctx.getByLabel('Name', { exact: true });
  await expect(name).toHaveValue(upstream.name);

  const descriptionField = ctx.getByLabel('Description');
  await expect(descriptionField).toHaveValue(upstream.desc);

  // Verify node information
  await expect(ctx.getByRole('textbox', { name: 'Host', exact: true }).nth(0)).toHaveValue('node1.example.com');
  await expect(ctx.getByRole('spinbutton', { name: 'Port', exact: true }).nth(0)).toHaveValue('8080');
  await expect(ctx.getByRole('spinbutton', { name: 'Weight', exact: true }).nth(0)).toHaveValue('10');
  await expect(ctx.getByRole('spinbutton', { name: 'Priority', exact: true }).nth(0)).toHaveValue('1');

  // Verify load balancing type
  await expect(
    ctx
      .getByRole('combobox', { name: 'Type', exact: true })
      .locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
      )
  ).toContainText('chash');

  // Verify Hash On field
  await expect(
    ctx
      .getByRole('combobox', { name: 'Hash On', exact: true })
      .locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
      )
  ).toContainText('header');

  // Verify Key field
  const keyField = ctx.getByLabel('Key', { exact: true });
  await expect(keyField).toHaveValue('X-Custom-Header');

  // Verify protocol (Scheme)
  await expect(
    ctx
      .getByRole('combobox', { name: 'Scheme', exact: true })
      .locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
      )
  ).toContainText('https');

  // Verify retry count field (Retries)
  const retriesField = ctx.getByLabel('Retries');
  await expect(retriesField).toHaveValue('5');

  // Verify retry timeout field (Retry Timeout)
  const retryTimeoutField = ctx.getByLabel('Retry timeout');
  await expect(retryTimeoutField).toHaveValue('6');

  // Verify Pass Host field
  await expect(
    ctx
      .getByRole('combobox', { name: 'Pass Host', exact: true })
      .locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
      )
  ).toContainText('rewrite');

  // Verify Upstream Host field
  const upstreamHostField = ctx.getByLabel('Upstream Host');
  await expect(upstreamHostField).toHaveValue('custom.upstream.host');

  // Verify timeout settings (Timeout)
  await uiConfigureOptionalSection(ctx, 'Timeout');
  await expect(ctx.getByLabel('Connect', { exact: true })).toHaveValue('3');
  await expect(ctx.getByLabel('Send', { exact: true })).toHaveValue('3');
  await expect(ctx.getByLabel('Read', { exact: true })).toHaveValue('3');

  // Verify keepalive pool settings (Keepalive Pool)
  await uiConfigureOptionalSection(ctx, 'Keepalive Pool');
  await expect(ctx.getByLabel('Size', { exact: true })).toHaveValue('320');
  await expect(ctx.getByLabel('IDLE Timeout', { exact: true })).toHaveValue('60');
  await expect(ctx.getByLabel('Requests', { exact: true })).toHaveValue('1000');
}
