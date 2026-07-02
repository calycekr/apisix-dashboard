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
import { consumersPom } from '@e2e/pom/consumers';
import { e2eReq } from '@e2e/utils/req';
import { test } from '@e2e/utils/test';
import { uiHasToastMsg, uiSelectByLabel } from '@e2e/utils/ui';
import { expect } from '@playwright/test';
import { customAlphabet } from 'nanoid';

import { deleteAllConsumers } from '@/apis/consumers';

// Consumer usernames can only contain: a-zA-Z0-9_-
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);
const consumerUsername = `testconsumer${nanoid()}`;
const description = 'Test consumer with all fields filled';

test.beforeAll(async () => {
  await deleteAllConsumers(e2eReq);
});

test('should CRUD consumer with all fields', async ({ page }) => {
  test.slow();

  await consumersPom.toIndex(page);
  await consumersPom.isIndexPage(page);

  await consumersPom.getAddConsumerBtn(page).click();
  await consumersPom.isAddPage(page);

  await test.step('submit with all fields', async () => {
    // Fill username (required)
    await page.getByRole('textbox', { name: 'Username' }).fill(consumerUsername);

    // Fill description (optional)
    await page.getByRole('textbox', { name: 'Description' }).fill(description);

    await uiSelectByLabel(page, 'Labels', 'version:v1');
    await uiSelectByLabel(page, 'Labels', 'env:test');
    await uiSelectByLabel(page, 'Labels', 'team:engineering');
    await page.keyboard.press('Escape').catch(() => {});

    // Submit the form
    await consumersPom.getAddBtn(page).click();
    await consumersPom.isDetailPage(page);
  });

  await test.step('auto navigate to consumer detail page', async () => {
    await consumersPom.isDetailPage(page);

    // Verify the consumer username
    await expect(page.getByRole('textbox', { name: 'Username' }))
      .toHaveValue(consumerUsername);
  });

  await test.step('edit and update all fields', async () => {
    // Update description
    await page.getByRole('textbox', { name: 'Description' }).fill('Updated: ' + description);

    // Update labels - remove old ones and add new ones
    const labelsSelect = page
      .getByRole('combobox', { name: 'Labels' })
      .locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
      )
      .first();
    const removeButtons = labelsSelect.locator('.ant-select-selection-item-remove');
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
    }

    // Add new labels
    await uiSelectByLabel(page, 'Labels', 'version:v2');
    await uiSelectByLabel(page, 'Labels', 'env:production');
    await uiSelectByLabel(page, 'Labels', 'team:platform');
    await page.keyboard.press('Escape').catch(() => {});

    // Save changes
    await page.getByRole('button', { name: 'Save' }).click();
    await page
      .getByRole('dialog', { name: 'Review Changes Before Saving' })
      .getByRole('button', { name: 'Confirm & Save' })
      .click();
    await uiHasToastMsg(page, {
      hasText: 'Consumer saved and reloaded from APISIX',
    });

    // Verify updates
    await expect(page.getByRole('textbox', { name: 'Description' }))
      .toHaveValue('Updated: ' + description);
  });

  await test.step('verify consumer in list page', async () => {
    await consumersPom.getConsumerNavBtn(page).click();
    await consumersPom.isIndexPage(page);

    // Find the consumer in the list
    const row = page.getByRole('row', { name: consumerUsername });
    await expect(row).toBeVisible();
  });

  await test.step('delete consumer', async () => {
    // Navigate to detail page
    await page
      .getByRole('row', { name: consumerUsername })
      .getByRole('link', { name: consumerUsername, exact: true })
      .click();
    await consumersPom.isDetailPage(page);

    // Delete
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page
      .getByRole('dialog', { name: 'Delete Consumer' })
      .getByRole('button', { name: 'Delete' })
      .click();

    // Verify deletion
    await uiHasToastMsg(page, {
      hasText: 'Consumer deleted successfully',
    });

    // Navigate to consumers list to verify consumer is gone
    await consumersPom.toIndex(page);
    await consumersPom.isIndexPage(page);
    await expect(page.getByRole('cell', { name: consumerUsername })).toBeHidden();
  });
});
