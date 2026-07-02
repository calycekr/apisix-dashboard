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
import { pluginConfigsPom } from '@e2e/pom/plugin_configs';
import { randomId } from '@e2e/utils/common';
import { e2eReq } from '@e2e/utils/req';
import { test } from '@e2e/utils/test';
import {
  uiFillMonacoEditor,
  uiGetMonacoEditor,
  uiHasToastMsg,
  uiSelectByLabel,
} from '@e2e/utils/ui';
import { expect } from '@playwright/test';

import { API_PLUGIN_CONFIGS } from '@/config/constant';
import type { APISIXType } from '@/types/schema/apisix';

// Helper function to delete all plugin configs
const deleteAllPluginConfigs = async (req: typeof e2eReq) => {
  const response = await req.get<unknown, APISIXType['RespPluginConfigList']>(
    API_PLUGIN_CONFIGS
  );
  const list = response.data.list || [];
  await Promise.all(
    list.map((item) => req.delete(`${API_PLUGIN_CONFIGS}/${item.value.id}`))
  );
};

const pluginConfigNameWithAllFields = randomId('test-plugin-config-full');
const description =
  'This is a test description for the plugin config with all fields';

test.beforeAll(async () => {
  await deleteAllPluginConfigs(e2eReq);
});

test('should CRUD plugin config with all fields', async ({ page }) => {
  test.slow();

  // Navigate to the plugin config list page
  await pluginConfigsPom.toIndex(page);
  await pluginConfigsPom.isIndexPage(page);

  // Click the add plugin config button
  await pluginConfigsPom.getAddPluginConfigBtn(page).click();
  await pluginConfigsPom.isAddPage(page);

  await test.step('fill in all fields', async () => {
    // Fill in basic fields
    await page
      .getByLabel('Name', { exact: true })
      .first()
      .fill(pluginConfigNameWithAllFields);
    await page.getByLabel('Description').first().fill(description);

    // Add labels
    await uiSelectByLabel(page, 'Labels', 'env:production');
    await uiSelectByLabel(page, 'Labels', 'version:v1.0');
    await page.keyboard.press('Escape').catch(() => {});

    // Add plugins
    const selectPluginsBtn = page.getByRole('button', { name: 'Add Plugin' });
    await selectPluginsBtn.click();

    // Add response-rewrite plugin
    const selectPluginsDialog = page.getByRole('dialog', {
      name: 'Add Plugin',
      exact: true,
    });
    const searchInput = selectPluginsDialog.getByPlaceholder(
      'Search by name, capability, or description'
    );
    await searchInput.fill('response-rewrite');

    await selectPluginsDialog
      .getByTestId('plugin-response-rewrite')
      .getByRole('button', { name: 'Add' })
      .click();

    const addPluginDialog = page.getByRole('dialog', {
      name: 'Add Plugin: response-rewrite',
    });
    await addPluginDialog.getByRole('tab', { name: 'JSON' }).click();
    const pluginEditor = await uiGetMonacoEditor(page, addPluginDialog);
    await uiFillMonacoEditor(
      page,
      pluginEditor,
      '{"body": "test response body", "headers": {"X-Custom-Header": "custom-value"}}'
    );
    // add plugin
    await addPluginDialog.getByRole('button', { name: 'Add Plugin' }).click();
    await expect(addPluginDialog).toBeHidden();
    await selectPluginsDialog.getByLabel('Close', { exact: true }).click();
    await expect(selectPluginsDialog).toBeHidden();

    await expect(page.getByTestId('plugin-response-rewrite')).toBeVisible();

    const createResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes(API_PLUGIN_CONFIGS)
    );

    // Submit the form
    await pluginConfigsPom.getAddBtn(page).click();
    const response = await createResponse;
    const requestPayload = response.request().postDataJSON() as Record<
      string,
      unknown
    >;
    expect(requestPayload).toMatchObject({
      name: pluginConfigNameWithAllFields,
      desc: description,
      labels: {
        env: 'production',
        version: 'v1.0',
      },
      plugins: {
        'response-rewrite': {
          body: 'test response body',
          headers: {
            'X-Custom-Header': 'custom-value',
          },
        },
      },
    });
    expect(requestPayload).not.toHaveProperty('id');
    expect(requestPayload).not.toHaveProperty('create_time');
    expect(requestPayload).not.toHaveProperty('update_time');
    await uiHasToastMsg(page, {
      hasText: 'Plugin Config created and verified',
    });
  });

  await test.step('auto navigate to plugin config detail page and verify all fields', async () => {
    // After creation, we should be redirected to the plugin configs detail page
    await pluginConfigsPom.isDetailPage(page);

    // Verify the plugin config details
    // Verify ID exists
    const ID = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(ID).toBeVisible();
    await expect(ID).toBeDisabled();

    // Verify the plugin config name
    const name = page.getByLabel('Name', { exact: true }).first();
    await expect(name).toHaveValue(pluginConfigNameWithAllFields);
    await expect(name).toBeEnabled();

    // Verify the description
    const desc = page.getByLabel('Description').first();
    await expect(desc).toHaveValue(description);
    await expect(desc).toBeEnabled();

    // Verify labels
    await expect(page.getByText('env:production').first()).toBeVisible();
    await expect(page.getByText('version:v1.0').first()).toBeVisible();

    // Verify Plugins
    await expect(page.getByTestId('plugin-response-rewrite')).toBeVisible();
  });

  await test.step('edit and update plugin config in detail page', async () => {
    // Detail pages are immediately editable
    const nameField = page.getByLabel('Name', { exact: true }).first();
    await expect(nameField).toBeEnabled();

    // Update the description field
    const descriptionField = page.getByLabel('Description').first();
    await descriptionField.fill(
      'Updated description for testing all fields'
    );

    // Update labels - just add a new one
    await uiSelectByLabel(page, 'Labels', 'team:backend');
    await page.keyboard.press('Escape').catch(() => {});

    // Update response-rewrite plugin configuration
    const responseRewritePlugin = page.getByTestId('plugin-response-rewrite');
    await responseRewritePlugin.getByRole('button', { name: 'Edit' }).click();

    const editPluginDialog = page.getByRole('dialog', {
      name: 'Edit Plugin: response-rewrite',
    });
    await editPluginDialog.getByRole('tab', { name: 'JSON' }).click();
    const pluginEditor = await uiGetMonacoEditor(page, editPluginDialog);
    await uiFillMonacoEditor(
      page,
      pluginEditor,
      '{"body": "updated response body", "headers": {"X-Updated-Header": "updated-value"}}'
    );
    await editPluginDialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(editPluginDialog).toBeHidden();

    const saveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes(API_PLUGIN_CONFIGS)
    );

    // Click the Save button to save changes
    const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
    await saveBtn.click();
    await page
      .getByRole('dialog', { name: 'Review Changes Before Saving' })
      .getByRole('button', { name: 'Confirm & Save' })
      .click();
    const response = await saveResponse;
    const requestPayload = response.request().postDataJSON() as Record<
      string,
      unknown
    >;
    expect(requestPayload).toMatchObject({
      name: pluginConfigNameWithAllFields,
      desc: 'Updated description for testing all fields',
      labels: {
        env: 'production',
        version: 'v1.0',
        team: 'backend',
      },
      plugins: {
        'response-rewrite': {
          body: 'updated response body',
          headers: {
            'X-Updated-Header': 'updated-value',
          },
        },
      },
    });
    expect(requestPayload).not.toHaveProperty('id');
    expect(requestPayload).not.toHaveProperty('create_time');
    expect(requestPayload).not.toHaveProperty('update_time');

    // Verify the update was successful
    await uiHasToastMsg(page, {
      hasText: 'Plugin Config saved and reloaded from APISIX',
    });
    await page.keyboard.press('Escape').catch(() => {});

    // Verify we're back in detail view mode
    await pluginConfigsPom.isDetailPage(page);

    // Verify the updated fields
    // Verify description
    await expect(page.getByLabel('Description').first()).toHaveValue(
      'Updated description for testing all fields'
    );

    // Verify updated labels
    await expect(page.getByText('env:production').first()).toBeVisible();
    await expect(page.getByText('version:v1.0').first()).toBeVisible();
    await expect(page.getByText('team:backend').first()).toBeVisible();

    // Verify plugins - response-rewrite should still be there
    await expect(page.getByTestId('plugin-response-rewrite')).toBeVisible();

    // Return to list page and verify the plugin config exists
    await pluginConfigsPom.getPluginConfigNavBtn(page).click();
    await pluginConfigsPom.isIndexPage(page);

    // Find the row with our plugin config
    const row = page.getByRole('row', { name: pluginConfigNameWithAllFields });
    await expect(row).toBeVisible();
  });

  await test.step('delete plugin config in detail page', async () => {
    // Navigate to detail page
    await page
      .getByRole('row', { name: pluginConfigNameWithAllFields })
      .getByRole('link', { name: pluginConfigNameWithAllFields, exact: true })
      .click();
    await pluginConfigsPom.isDetailPage(page);

    // Delete the plugin config
    await page.getByRole('button', { name: 'Delete' }).click();

    await page
      .getByRole('dialog', { name: 'Delete Plugin Config' })
      .getByRole('button', { name: 'Delete' })
      .click();

    // Will redirect to plugin configs page
    await pluginConfigsPom.isIndexPage(page);
    await uiHasToastMsg(page, {
      hasText: 'Plugin Config deleted successfully',
    });
    await expect(
      page.getByRole('link', {
        name: pluginConfigNameWithAllFields,
        exact: true,
      })
    ).toBeHidden();

    // Final verification: Reload the page and check again to ensure it's really gone
    await page.reload();
    await pluginConfigsPom.isIndexPage(page);

    // After reload, the plugin config should still be gone
    await expect(
      page.getByRole('link', {
        name: pluginConfigNameWithAllFields,
        exact: true,
      })
    ).toBeHidden();
  });
});
