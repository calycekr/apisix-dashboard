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

const pluginConfigName = randomId('test-plugin-config');

test.beforeAll(async () => {
  await deleteAllPluginConfigs(e2eReq);
});

test('should CRUD plugin config with required fields', async ({ page }) => {
  await pluginConfigsPom.toIndex(page);
  await pluginConfigsPom.isIndexPage(page);

  await pluginConfigsPom.getAddPluginConfigBtn(page).click();
  await pluginConfigsPom.isAddPage(page);

  await test.step('verify Add button exists', async () => {
    // Just verify the Add button is present and accessible
    const addBtn = pluginConfigsPom.getAddBtn(page);
    await expect(addBtn).toBeVisible();
    
    // Note: Plugin configs may allow submission without plugins initially,
    // as they only require a name field. The actual validation happens server-side.
  });

  await test.step('submit with required fields', async () => {
    // Fill in the Name field
    await page
      .getByLabel('Name', { exact: true })
      .first()
      .fill(pluginConfigName);

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
    await addPluginDialog.getByRole('tab', { name: 'Plugin JSON' }).click();
    const pluginEditor = await uiGetMonacoEditor(page, addPluginDialog);
    await uiFillMonacoEditor(page, pluginEditor, '{"body": "test response"}');
    // add plugin
    await addPluginDialog.getByRole('button', { name: 'Add Plugin' }).click();
    await expect(addPluginDialog).toBeHidden();
    await selectPluginsDialog.getByLabel('Close', { exact: true }).click();
    await expect(selectPluginsDialog).toBeHidden();

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
      name: pluginConfigName,
      plugins: {
        'response-rewrite': {
          body: 'test response',
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

  await test.step('auto navigate to plugin config detail page', async () => {
    await pluginConfigsPom.isDetailPage(page);

    // Verify the plugin config details
    // Verify ID exists
    const ID = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(ID).toBeVisible();
    await expect(ID).toBeDisabled();

    // Verify the plugin config name
    const name = page.getByLabel('Name', { exact: true }).first();
    await expect(name).toHaveValue(pluginConfigName);

    // Verify the plugin exists
    await expect(page.getByTestId('plugin-response-rewrite')).toBeVisible();
  });

  await test.step('edit and update plugin config in detail page', async () => {
    const nameField = page.getByLabel('Name', { exact: true }).first();
    await expect(nameField).toBeEnabled();

    // Update the name field
    await nameField.fill(`${pluginConfigName}-updated`);

    // Update plugin configuration
    const responseRewritePlugin = page.getByTestId('plugin-response-rewrite');
    await responseRewritePlugin.getByRole('button', { name: 'Edit' }).click();

    const editPluginDialog = page.getByRole('dialog', {
      name: 'Edit Plugin: response-rewrite',
    });
    await editPluginDialog.getByRole('tab', { name: 'Plugin JSON' }).click();
    const pluginEditor = await uiGetMonacoEditor(page, editPluginDialog);
    await uiFillMonacoEditor(
      page,
      pluginEditor,
      '{"body": "updated response"}'
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
      name: `${pluginConfigName}-updated`,
      plugins: {
        'response-rewrite': {
          body: 'updated response',
        },
      },
    });
    expect(requestPayload).not.toHaveProperty('id');
    expect(requestPayload).not.toHaveProperty('create_time');
    expect(requestPayload).not.toHaveProperty('update_time');
    await expect(page.getByText('No pending changes')).toBeVisible({
      timeout: 30000,
    });

    // Verify we're back in detail view mode
    await pluginConfigsPom.isDetailPage(page);

    // Verify the updated fields
    await expect(page.getByLabel('Name', { exact: true }).first()).toHaveValue(
      `${pluginConfigName}-updated`
    );

    // Return to list page and verify the plugin config exists
    await pluginConfigsPom.getPluginConfigNavBtn(page).click();
    await pluginConfigsPom.isIndexPage(page);

    // Find the row with our plugin config
    const row = page.getByRole('row', {
      name: `${pluginConfigName}-updated`,
    });
    await expect(row).toBeVisible();
  });

  await test.step('plugin config should exist in list page', async () => {
    await pluginConfigsPom.getPluginConfigNavBtn(page).click();
    await pluginConfigsPom.isIndexPage(page);
    await expect(
      page.getByRole('cell', { name: `${pluginConfigName}-updated` })
    ).toBeVisible();

    // Click on the plugin config name to go to the detail page
    await page
      .getByRole('row', { name: `${pluginConfigName}-updated` })
      .getByRole('link', { name: `${pluginConfigName}-updated`, exact: true })
      .click();
    await pluginConfigsPom.isDetailPage(page);
  });

  await test.step('delete plugin config in detail page', async () => {
    // We're already on the detail page from the previous step

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
      page.getByRole('cell', { name: `${pluginConfigName}-updated` })
    ).toBeHidden();
  });
});
