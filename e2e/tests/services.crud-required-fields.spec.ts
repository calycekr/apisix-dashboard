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
import { servicesPom } from '@e2e/pom/services';
import { randomId } from '@e2e/utils/common';
import { e2eReq } from '@e2e/utils/req';
import { test } from '@e2e/utils/test';
import { uiHasToastMsg, uiSelectByLabel } from '@e2e/utils/ui';
import {
  uiCheckServiceRequiredFields,
  uiFillServiceRequiredFields,
} from '@e2e/utils/ui/services';
import {
  uiFillUpstreamRequiredFields,
  uiOpenInlineUpstream,
} from '@e2e/utils/ui/upstreams';
import { expect } from '@playwright/test';

import { deleteAllServices } from '@/apis/services';

test.describe.configure({ mode: 'serial' });

const serviceName = randomId('test-service');

test.beforeAll(async () => {
  await deleteAllServices(e2eReq);
});

test('should CRUD service with required fields', async ({ page }) => {
  await servicesPom.toIndex(page);
  await servicesPom.isIndexPage(page);

  await servicesPom.getAddServiceBtn(page).click();
  await servicesPom.isAddPage(page);

  await test.step('submit with required fields', async () => {
    await uiFillServiceRequiredFields(page, {
      name: serviceName,
    });

    // Ensure upstream is valid. In some configurations (e.g. http&stream),
    // the backend might require a valid upstream configuration.
    await uiOpenInlineUpstream(page);
    const upstreamSection = page.getByRole('group', {
      name: 'Inline Upstream target',
    });
    await uiFillUpstreamRequiredFields(upstreamSection, {
      name: 'service-required-upstream',
      nodes: [{ host: '127.0.0.1', port: 80, weight: 1 }],
    });

    // Ensure the name field is properly filled before submitting
    const nameField = page.locator('input[name="name"]');
    await expect(nameField).toHaveValue(serviceName);

    await expect(async () => {
      await servicesPom.getAddBtn(page).click();
      await servicesPom.isDetailPage(page);
    }).toPass({ timeout: 20000 });
  });

  await test.step('auto navigate to service detail page', async () => {
    await servicesPom.isDetailPage(page);
    // Verify ID exists
    const ID = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(ID).toBeVisible();
    await expect(ID).toBeDisabled();
    await uiCheckServiceRequiredFields(page, {
      name: serviceName,
    });
  });

  await test.step('can see service in list page', async () => {
    await servicesPom.getServiceNavBtn(page).click();
    await expect(page.getByRole('cell', { name: serviceName })).toBeVisible();
  });

  await test.step('navigate to service detail page', async () => {
    // Click on the service name to go to the detail page
    await page
      .getByRole('row', { name: serviceName })
      .getByRole('link', { name: serviceName, exact: true })
      .click();
    await servicesPom.isDetailPage(page);
    const name = page.getByRole('textbox', { name: 'Name' }).first();
    await expect(name).toHaveValue(serviceName);
  });

  await test.step('edit and update service in detail page', async () => {
    const nameField = page.getByRole('textbox', { name: 'Name' }).first();
    await expect(nameField).toBeEnabled();

    // Update the description field (use first() to get service description, not upstream description)
    const descriptionField = page.getByLabel('Description').first();
    await descriptionField.fill('Updated description for testing');

    // Add a simple label (key:value format)
    // Use first() to get service labels field, not upstream labels
    await uiSelectByLabel(page, 'Labels', 'version:v1');

    // Click the Save button to save changes
    const saveBtn = page.getByRole('button', { name: 'Save' });
    await saveBtn.click();
    await page
      .getByRole('dialog', { name: 'Review Changes Before Saving' })
      .getByRole('button', { name: 'Confirm & Save' })
      .click();

    // Verify the update was successful
    await uiHasToastMsg(page, {
      hasText: 'Service saved and reloaded from APISIX',
    });

    // Verify we're back in detail view mode
    await servicesPom.isDetailPage(page);

    // Verify the updated fields
    await expect(page.getByLabel('Description').first()).toHaveValue(
      'Updated description for testing'
    );

    // check labels
    await expect(
      page
        .getByRole('combobox', { name: 'Labels' })
        .locator(
          'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
        )
        .first()
    ).toContainText('version:v1');

    // Return to list page and verify the service exists
    await servicesPom.getServiceNavBtn(page).click();
    await servicesPom.isIndexPage(page);

    // Find the row with our service
    const row = page.getByRole('row', { name: serviceName });
    await expect(row).toBeVisible();
  });

  await test.step('delete service in detail page', async () => {
    // Navigate back to detail page
    await page
      .getByRole('row', { name: serviceName })
      .getByRole('link', { name: serviceName, exact: true })
      .click();
    await servicesPom.isDetailPage(page);

    await page.getByRole('button', { name: 'Delete' }).first().click();

    await page
      .getByRole('dialog', { name: 'Delete Service' })
      .getByRole('button', { name: 'Delete' })
      .click();

    // will redirect to services page
    await servicesPom.isIndexPage(page);
    await uiHasToastMsg(page, {
      hasText: 'Service deleted successfully',
    });
    await expect(page.getByRole('cell', { name: serviceName })).toBeHidden();
  });
});
