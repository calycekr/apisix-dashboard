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

import { globalRulePom } from '@e2e/pom/global_rules';
import { test } from '@e2e/utils/test';
import {
  uiFillMonacoEditor,
  uiGetMonacoEditor,
  uiHasToastMsg,
} from '@e2e/utils/ui';
import { expect } from '@playwright/test';

import { API_GLOBAL_RULES } from '@/config/constant';

test('should CRUD global rule with multiple plugins', async ({ page }) => {
  let globalRuleId: string;

  await test.step('navigate to add global rule page', async () => {
    await globalRulePom.toAdd(page);
    await globalRulePom.isAddPage(page);
  });

  await test.step('add global rule with multiple plugins', async () => {
    // ID field should be auto-generated
    const idInput = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(idInput).toBeVisible();
    await expect(idInput).not.toHaveValue('');
    globalRuleId = await idInput.inputValue();

    // Add first plugin - response-rewrite
    const selectPluginBtn = page.getByRole('button', {
      name: 'Add Plugin',
    });
    await selectPluginBtn.click();

    const dialog = page.getByRole('dialog', {
      name: 'Add Plugin',
      exact: true,
    });
    await expect(dialog).toBeVisible();

    const searchInput = dialog.getByPlaceholder(
      'Search by name, capability, or description'
    );
    await searchInput.fill('response-rewrite');

    await dialog
      .getByTestId('plugin-response-rewrite')
      .getByRole('button', { name: 'Add' })
      .click();

    const pluginDialog = page.getByRole('dialog', {
      name: 'Add Plugin: response-rewrite',
    });
    await expect(pluginDialog).toBeVisible();
    await pluginDialog.getByRole('tab', { name: 'Plugin JSON' }).click();

    // Configure response-rewrite with custom configuration using Monaco editor
    const pluginEditor = await uiGetMonacoEditor(page, pluginDialog);
    await uiFillMonacoEditor(
      page,
      pluginEditor,
      JSON.stringify({
        body: 'test response',
        headers: {
          set: {
            'X-Global-Rule': 'test-global-rule',
          },
        },
      })
    );

    await pluginDialog.getByRole('button', { name: 'Add Plugin' }).click();
    await expect(pluginDialog).toBeHidden();
    await dialog.getByLabel('Close', { exact: true }).click();
    await expect(dialog).toBeHidden();

    // Add second plugin - cors
    await selectPluginBtn.click();

    const corsDialog = page.getByRole('dialog', {
      name: 'Add Plugin',
      exact: true,
    });
    await expect(corsDialog).toBeVisible();

    const corsSearchInput = corsDialog.getByPlaceholder(
      'Search by name, capability, or description'
    );
    await corsSearchInput.fill('cors');

    await corsDialog
      .getByTestId('plugin-cors')
      .getByRole('button', { name: 'Add' })
      .click();

    const corsPluginDialog = page.getByRole('dialog', {
      name: 'Add Plugin: cors',
    });
    await expect(corsPluginDialog).toBeVisible();
    await corsPluginDialog.getByRole('tab', { name: 'Plugin JSON' }).click();

    // Submit with simple configuration for cors
    const corsEditor = await uiGetMonacoEditor(page, corsPluginDialog);
    await uiFillMonacoEditor(page, corsEditor, '{}');

    await corsPluginDialog.getByRole('button', { name: 'Add Plugin' }).click();
    await expect(corsPluginDialog).toBeHidden();
    await corsDialog.getByLabel('Close', { exact: true }).click();
    await expect(corsDialog).toBeHidden();

    // Submit the form
    await globalRulePom.getAddBtn(page).click();

    await uiHasToastMsg(page, {
      hasText: 'Global Rule created and verified',
    });

    await globalRulePom.isDetailPage(page);
  });

  await test.step('verify global rule with multiple plugins', async () => {
    await expect(page).toHaveURL(
      (url) => url.pathname.endsWith(`/global_rules/detail/${globalRuleId}`)
    );

    // Verify we're on the detail page
    await globalRulePom.isDetailPage(page);
  });

  await test.step('update global rule plugins from detail page', async () => {
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
      JSON.stringify({
        body: 'updated global response',
        headers: {
          set: {
            'X-Global-Rule': 'updated-global-rule',
          },
        },
      })
    );
    await editPluginDialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(editPluginDialog).toBeHidden();

    const saveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes(`${API_GLOBAL_RULES}/${globalRuleId}`)
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
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
      plugins: {
        'response-rewrite': {
          body: 'updated global response',
          headers: {
            set: {
              'X-Global-Rule': 'updated-global-rule',
            },
          },
        },
      },
    });
    expect(requestPayload).not.toHaveProperty('id');
    expect(requestPayload).not.toHaveProperty('create_time');
    expect(requestPayload).not.toHaveProperty('update_time');

    await uiHasToastMsg(page, {
      hasText: 'Global Rule saved and reloaded from APISIX',
    });
  });

  await test.step('delete global rule from detail page', async () => {
    await page.getByRole('button', { name: 'Delete' }).click();

    await page
      .getByRole('dialog', { name: 'Delete Global Rule' })
      .getByRole('button', { name: 'Delete' })
      .click();

    await globalRulePom.isIndexPage(page);

    await uiHasToastMsg(page, {
      hasText: 'Global Rule deleted successfully',
    });
  });
});
