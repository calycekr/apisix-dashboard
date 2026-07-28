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
import { upstreamsPom } from '@e2e/pom/upstreams';
import { randomId } from '@e2e/utils/common';
import { e2eReq } from '@e2e/utils/req';
import { test } from '@e2e/utils/test';
import { uiHasToastMsg, uiSelectByLabel } from '@e2e/utils/ui';
import {
  uiCheckUpstreamRequiredFields,
  uiFillUpstreamRequiredFields,
} from '@e2e/utils/ui/upstreams';
import { expect } from '@playwright/test';

import { deleteAllUpstreams } from '@/apis/upstreams';
import type { APISIXType } from '@/types/schema/apisix';

const upstreamName = randomId('test-upstream');
const upstreamId = randomId('test-upstream-id');
const nodes: APISIXType['UpstreamNode'][] = [
  { host: 'test.com' },
  { host: 'test2.com', port: 80 },
];

test.beforeAll(async () => {
  await deleteAllUpstreams(e2eReq);
});

test('should CRUD upstream with required fields', async ({ page }) => {
  await upstreamsPom.toIndex(page);
  await upstreamsPom.isIndexPage(page);

  await upstreamsPom.getAddUpstreamBtn(page).click();
  await upstreamsPom.isAddPage(page);
  await expect(
    page.getByRole('textbox', { name: 'Discovery Args', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('switch', { name: 'Enable health checks', exact: true })
  ).toBeVisible();

  await test.step('submit with required fields', async () => {
    await page.getByRole('textbox', { name: 'ID', exact: true }).fill(upstreamId);
    await uiFillUpstreamRequiredFields(page, {
      name: upstreamName,
      nodes,
    });
    await upstreamsPom.getAddBtn(page).click();
    await upstreamsPom.isDetailPage(page);
  });

  await test.step('verify upstream detail page', async () => {
    const ID = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(ID).toBeVisible();
    await expect(ID).toBeDisabled();
    await expect(ID).toHaveValue(upstreamId);
    await uiCheckUpstreamRequiredFields(page, {
      name: upstreamName,
      nodes,
    });
  });

  await test.step('can see upstream in list page', async () => {
    await upstreamsPom.getUpstreamNavBtn(page).click();
    await expect(page.getByRole('cell', { name: upstreamName })).toBeVisible();
  });

  await test.step('navigate to upstream detail page', async () => {
    // Click on the upstream name to go to the detail page
    await page
      .getByRole('row', { name: upstreamName })
      .getByRole('link', { name: upstreamName, exact: true })
      .click();
    await upstreamsPom.isDetailPage(page);
    const name = page.getByLabel('Name', { exact: true });
    await expect(name).toHaveValue(upstreamName);
  });

  await test.step('edit and update upstream in detail page', async () => {
    const nameField = page.getByLabel('Name', { exact: true });
    await expect(nameField).toBeEnabled();

    // Update the description field
    const descriptionField = page.getByLabel('Description');
    await descriptionField.fill('Updated description for testing');

    // Add a simple label (key:value format)
    await uiSelectByLabel(page, 'Labels', 'version:v1');

    // Update a node - change the host of the first node
    const firstRowHost = page
      .getByRole('textbox', { name: 'Host', exact: true })
      .nth(0);
    await firstRowHost.fill('updated-test.com');
    await expect(firstRowHost).toHaveValue('updated-test.com');
    await firstRowHost.blur();

    // Click the Save button to save changes
    const saveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/apisix/admin/upstreams/')
    );
    const saveBtn = page.getByRole('button', { name: 'Save' });
    await saveBtn.click();
    await page
      .getByRole('dialog', { name: 'Review changes before saving' })
      .getByRole('button', { name: 'Confirm & Save' })
      .click();
    const response = await saveResponse;
    const requestPayload = response.request().postDataJSON() as {
      nodes?: Array<{ host?: string }>;
    };
    expect(requestPayload.nodes?.[0]?.host).toBe('updated-test.com');

    // Verify the update was successful
    await uiHasToastMsg(page, {
      hasText: 'Upstream saved and reloaded from APISIX',
    });

    // Verify we're back in detail view mode
    await upstreamsPom.isDetailPage(page);

    // Verify the updated fields
    await expect(page.getByLabel('Description')).toHaveValue(
      'Updated description for testing'
    );

    // Check if the updated node host text is visible somewhere in the nodes section
    await expect(
      page.getByRole('textbox', { name: 'Host', exact: true }).nth(0)
    ).toHaveValue('updated-test.com');

    // check labels
    await expect(
      page
        .getByRole('combobox', { name: 'Labels' })
        .locator(
          'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
        )
    ).toContainText('version:v1');

    // Return to list page and verify the upstream exists
    await upstreamsPom.getUpstreamNavBtn(page).click();
    await upstreamsPom.isIndexPage(page);

    // Find the row with our upstream
    const row = page.getByRole('row', { name: upstreamName });
    await expect(row).toBeVisible();
  });

  await test.step('delete upstream in detail page', async () => {
    await page
      .getByRole('row', { name: upstreamName })
      .getByRole('link', { name: upstreamName, exact: true })
      .click();
    await upstreamsPom.isDetailPage(page);

    await page.getByRole('button', { name: 'Delete' }).first().click();

    await page
      .getByRole('dialog', { name: 'Delete Upstream' })
      .getByRole('button', { name: 'Delete' })
      .click();

    // will redirect to upstreams page
    await upstreamsPom.isIndexPage(page);
    await uiHasToastMsg(page, {
      hasText: 'Upstream deleted successfully',
    });
    await expect(
      page.getByText('Refresh failed. Showing the last available data.')
    ).toBeHidden();
    await expect(page.getByRole('cell', { name: upstreamName })).toBeHidden();
  });
});
