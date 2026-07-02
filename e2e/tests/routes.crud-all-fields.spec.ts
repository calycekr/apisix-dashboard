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
import { routesPom } from '@e2e/pom/routes';
import { randomId } from '@e2e/utils/common';
import { e2eReq } from '@e2e/utils/req';
import { test } from '@e2e/utils/test';
import { uiHasToastMsg } from '@e2e/utils/ui';
import { uiFillUpstreamAllFields } from '@e2e/utils/ui/upstreams';
import { expect, type Page } from '@playwright/test';

import { deleteAllRoutes } from '@/apis/routes';
import type { APISIXType } from '@/types/schema/apisix';

const routeNameWithAllFields = randomId('test-route-full');
const routeUri = '/test-route-all-fields';
const description = 'This is a test description for the route with all fields';
// Define nodes to be used in the upstream section
const nodes: APISIXType['UpstreamNode'][] = [
  { host: 'test.com', port: 80, weight: 100 },
  { host: 'test2.com', port: 80, weight: 100 },
];

const getSelectContainer = (page: Page, label: string) =>
  page
    .getByRole('combobox', { name: label, exact: true })
    .locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
    )
    .first();

const addTagOptionsByLabel = async (
  page: Page,
  label: string,
  values: string[]
) => {
  const input = page.getByRole('combobox', { name: label, exact: true });
  const select = getSelectContainer(page, label);

  for (const value of values) {
    await input.click();
    await input.fill(value);
    await input.blur();
    await expect(select).toContainText(value);
  }

  await page.keyboard.press('Escape').catch(() => {});
};

test.beforeAll(async () => {
  await deleteAllRoutes(e2eReq);
});

test('should CRUD route with all fields', async ({ page }) => {
  test.slow();

  // Navigate to the route list page
  await routesPom.toIndex(page);
  await routesPom.isIndexPage(page);

  // Click the add route button
  await routesPom.getAddRouteBtn(page).click();
  await routesPom.isAddPage(page);

  await test.step('fill in all fields', async () => {
    // Fill in basic fields
    await page
      .getByLabel('Name', { exact: true })
      .first()
      .fill(routeNameWithAllFields);
    await page.getByLabel('Description').first().fill(description);
    await page.getByLabel('URI', { exact: true }).fill(routeUri);

    // Select HTTP methods
    await addTagOptionsByLabel(page, 'HTTP Methods', [
      'GET',
      'POST',
      'PUT',
      'DELETE',
    ]);

    await page.getByRole('button', { name: /Advanced matching/ }).click();

    // Fill in Host field - using more specific selector
    await page.locator('input[name="host"]').fill('example.com');

    // Fill in Remote Address field - using more specific selector
    await page
      .locator('input[name="remote_addr"]')
      .fill('192.168.1.0/24');

    // Set Priority
    await page.locator('input[name="priority"]').fill('100');

    // Toggle Status
    await getSelectContainer(page, 'Status').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(getSelectContainer(page, 'Status')).toContainText('Disabled');

    // Add upstream nodes
    await page.getByText('Define inline Upstream', { exact: true }).click();
    const upstreamSection = page.getByRole('group', {
      name: 'Inline Upstream target',
      exact: true,
    });
    await uiFillUpstreamAllFields(
      test,
      upstreamSection,
      {
        nodes: nodes,
        name: randomId('test-upstream-full'),
        desc: 'test',
      },
      page
    );

    await expect(page.getByRole('button', { name: 'Add Plugin' })).toBeVisible();

    // Submit the form
    await routesPom.getAddBtn(page).click();
    await uiHasToastMsg(page, {
      hasText: 'Route created and verified',
    });
  });

  await test.step('auto navigate to route detail page and verify all fields', async () => {
    // After creation, we should be redirected to the routes detail page
    await routesPom.isDetailPage(page);

    // Verify the route details
    // Verify ID exists
    const ID = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(ID).toBeVisible();
    await expect(ID).toBeDisabled();

    // Verify the route name
    const name = page.getByLabel('Name', { exact: true }).first();
    await expect(name).toHaveValue(routeNameWithAllFields);

    // Verify the description
    const desc = page.getByLabel('Description').first();
    await expect(desc).toHaveValue(description);

    // Verify the route URI
    const uri = page.getByLabel('URI', { exact: true });
    await expect(uri).toHaveValue(routeUri);

    // Verify HTTP methods
    const methods = getSelectContainer(page, 'HTTP Methods');
    await expect(methods).toContainText('GET');
    await expect(methods).toContainText('POST');
    await expect(methods).toContainText('PUT');
    await expect(methods).toContainText('DELETE');

    await page.getByRole('button', { name: /Advanced matching/ }).click();

    // Verify Host
    await expect(page.locator('input[name="host"]')).toHaveValue('example.com');

    // Verify Remote Address
    await expect(page.locator('input[name="remote_addr"]')).toHaveValue(
      '192.168.1.0/24'
    );

    // Verify Priority
    await expect(page.locator('input[name="priority"]')).toHaveValue('100');

    // Verify Status
    await expect(getSelectContainer(page, 'Status')).toContainText('Disabled');

    // Verify plugin picker is available for direct plugin configuration.
    await expect(page.getByRole('button', { name: 'Add Plugin' })).toBeVisible();
  });

  await test.step('edit and update route in detail page', async () => {
    // Verify we're in edit mode - fields should be editable now
    const nameField = page.getByLabel('Name', { exact: true }).first();
    await expect(nameField).toBeEnabled();

    // Update the description field
    const descriptionField = page.getByLabel('Description').first();
    await descriptionField.fill('Updated description for testing all fields');

    // Update URI
    const uriField = page.getByLabel('URI', { exact: true });
    await uriField.fill(`${routeUri}-updated`);

    // Update Host
    await page.locator('input[name="host"]').fill('updated-example.com');

    // Update Priority
    await page.locator('input[name="priority"]').fill('200');

    // Click the Save button to save changes
    const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
    await saveBtn.click();
    await page
      .getByRole('dialog', { name: 'Review Changes Before Saving' })
      .getByRole('button', { name: 'Confirm & Save' })
      .click();

    // Verify the update was successful
    await uiHasToastMsg(page, {
      hasText: 'Route saved and reloaded from APISIX',
    });

    // Verify we're back in detail view mode
    await routesPom.isDetailPage(page);

    // Verify the updated fields
    // Verify description
    await expect(page.getByLabel('Description').first()).toHaveValue(
      'Updated description for testing all fields'
    );

    // Check if the updated URI is visible
    await expect(page.getByLabel('URI', { exact: true })).toHaveValue(
      `${routeUri}-updated`
    );

    // Verify updated Host
    await expect(page.locator('input[name="host"]')).toHaveValue(
      'updated-example.com'
    );

    // Verify updated Priority
    await expect(page.locator('input[name="priority"]')).toHaveValue('200');

    // Return to list page and verify the route exists
    await routesPom.getRouteNavBtn(page).click();
    await routesPom.isIndexPage(page);

    // Find the row with our route
    const row = page.getByRole('row', { name: routeNameWithAllFields });
    await expect(row).toBeVisible();
  });

  await test.step('delete route in detail page', async () => {
    // Navigate to detail page
    await page
      .getByRole('row', { name: routeNameWithAllFields })
      .getByRole('link', { name: routeNameWithAllFields, exact: true })
      .click();
    await routesPom.isDetailPage(page);

    // Delete the route
    await page.getByRole('button', { name: 'Delete' }).first().click();

    await page
      .getByRole('dialog', { name: 'Delete Route' })
      .getByRole('button', { name: 'Delete' })
      .click();

    // Will redirect to routes page
    await routesPom.isIndexPage(page);
    await uiHasToastMsg(page, {
      hasText: 'Route deleted successfully',
    });
    await expect(
      page.getByRole('cell', { name: routeNameWithAllFields })
    ).toBeHidden();

    // Final verification: Reload the page and check again to ensure it's really gone
    await page.reload();
    await routesPom.isIndexPage(page);

    // After reload, the route should still be gone
    await expect(
      page.getByRole('cell', { name: routeNameWithAllFields })
    ).toBeHidden();
  });
});
