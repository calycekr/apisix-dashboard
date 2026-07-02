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
import { consumerGroupsPom } from '@e2e/pom/consumer_groups';
import { e2eReq } from '@e2e/utils/req';
import { test } from '@e2e/utils/test';
import {
  uiFillMonacoEditor,
  uiGetMonacoEditor,
  uiHasToastMsg,
} from '@e2e/utils/ui';
import { expect } from '@playwright/test';

import { deleteAllConsumerGroups } from '@/apis/consumer_groups';
import { API_CONSUMER_GROUPS } from '@/config/constant';

test.beforeAll(async () => {
  await deleteAllConsumerGroups(e2eReq);
});

test('should CRUD Consumer Group with required fields', async ({ page }) => {
  const testId = 'test-consumer-group-required';

  await consumerGroupsPom.toIndex(page);
  await consumerGroupsPom.isIndexPage(page);

  await test.step('create consumer group with required fields', async () => {
    // Navigate to add page
    await consumerGroupsPom.getAddConsumerGroupBtn(page).click();
    await consumerGroupsPom.isAddPage(page);

    // Fill in the ID
    const idField = page.getByRole('textbox', { name: 'ID', exact: true });
    await idField.clear();
    await idField.fill(testId);

    // Add a minimal plugin (UI requires at least one plugin)
    const selectPluginsBtn = page.getByRole('button', {
      name: 'Add Plugin',
    });
    await selectPluginsBtn.click();

    const selectPluginsDialog = page.getByRole('dialog', {
      name: 'Add Plugin',
      exact: true,
    });
    const searchInput = selectPluginsDialog.getByPlaceholder(
      'Search by name, capability, or description'
    );
    await searchInput.fill('basic-auth');

    await selectPluginsDialog
      .getByTestId('plugin-basic-auth')
      .getByRole('button', { name: 'Add' })
      .click();

    const addPluginDialog = page.getByRole('dialog', {
      name: 'Add Plugin: basic-auth',
    });
    await addPluginDialog.getByRole('tab', { name: 'JSON' }).click();
    const pluginEditor = await uiGetMonacoEditor(page, addPluginDialog);
    await uiFillMonacoEditor(page, pluginEditor, '{"hide_credentials": true}');

    await addPluginDialog.getByRole('button', { name: 'Add Plugin' }).click();
    await expect(addPluginDialog).toBeHidden();
    await selectPluginsDialog.getByLabel('Close', { exact: true }).click();
    await expect(selectPluginsDialog).toBeHidden();

    const createResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes(`${API_CONSUMER_GROUPS}/${testId}`)
    );

    // Submit the form
    await consumerGroupsPom.getAddBtn(page).click();
    const response = await createResponse;
    const requestPayload = response.request().postDataJSON() as Record<
      string,
      unknown
    >;
    expect(requestPayload).toMatchObject({
      plugins: {
        'basic-auth': {
          hide_credentials: true,
        },
      },
    });
    expect(requestPayload).not.toHaveProperty('id');
    expect(requestPayload).not.toHaveProperty('create_time');
    expect(requestPayload).not.toHaveProperty('update_time');
    await uiHasToastMsg(page, {
      hasText: 'Consumer Group created and verified',
    });

    // Should navigate to detail page
    await consumerGroupsPom.isDetailPage(page);
  });

  await test.step('verify consumer group in detail page', async () => {
    // Verify the ID
    const idField = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(idField).toHaveValue(testId);
    await expect(idField).toBeDisabled();
  });

  await test.step('verify consumer group exists in list', async () => {
    // Navigate to list page
    await consumerGroupsPom.getConsumerGroupNavBtn(page).click();
    await consumerGroupsPom.isIndexPage(page);

    // Verify consumer group exists in list
    await expect(
      page.getByRole('link', { name: testId, exact: true })
    ).toBeVisible();
  });

  await test.step('navigate to detail and verify can edit', async () => {
    // Click View button to go to detail page
    await page
      .getByRole('row', { name: new RegExp(testId) })
      .getByRole('link', { name: testId, exact: true })
      .click();
    await consumerGroupsPom.isDetailPage(page);

    // Detail pages are immediately editable
    const descField = page.getByRole('textbox', { name: 'Description' });
    await expect(descField).toBeEnabled();

    // Verify ID field is still disabled even in edit mode
    const idField = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(idField).toBeDisabled();

    await consumerGroupsPom.isDetailPage(page);
  });

  await test.step('delete consumer group', async () => {
    // Click Delete button
    await page.getByRole('button', { name: 'Delete' }).click();

    // Confirm deletion in dialog
    await page
      .getByRole('dialog', { name: 'Delete Consumer Group' })
      .getByRole('button', { name: 'Delete' })
      .click();

    // Should redirect to list page
    await consumerGroupsPom.isIndexPage(page);
    await uiHasToastMsg(page, {
      hasText: 'Consumer Group deleted successfully',
    });

    // Verify consumer group is deleted
    await expect(
      page.getByRole('link', { name: testId, exact: true })
    ).toBeHidden();
  });
});

