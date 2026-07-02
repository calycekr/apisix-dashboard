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
import { sslsPom } from '@e2e/pom/ssls';
import { genTLS } from '@e2e/utils/common';
import { e2eReq } from '@e2e/utils/req';
import { test } from '@e2e/utils/test';
import { uiHasToastMsg, uiSelectByLabel } from '@e2e/utils/ui';
import { uiCheckLabels } from '@e2e/utils/ui/labels';
import { uiFillSSLRequiredFields } from '@e2e/utils/ui/ssls';
import { expect } from '@playwright/test';

import { deleteAllSSLs } from '@/apis/ssls';
import type { APISIXType } from '@/types/schema/apisix';

const snis = [
  'full-test.example.com',
  'www.full-test.example.com',
  'api.full-test.example.com',
];

const initialLabels = {
  env: 'production',
  version: 'v1',
  team: 'backend',
};

test.beforeAll(async () => {
  await deleteAllSSLs(e2eReq);
});

test('should CRUD SSL with all fields', async ({ page }) => {
  test.slow();

  // Generate TLS certificates at runtime
  const { cert, key } = await genTLS();
  const sslDataAllFields: Partial<APISIXType['SSL']> = {
    snis,
    cert,
    key,
    labels: initialLabels,
    status: 1, // Enabled
  };

  await sslsPom.toIndex(page);
  await sslsPom.isIndexPage(page);

  await sslsPom.getAddSSLBtn(page).click();
  await sslsPom.isAddPage(page);

  await test.step('fill in all fields', async () => {
    // Fill in required fields
    await uiFillSSLRequiredFields(page, sslDataAllFields);

    // Add SSL Protocols
    await uiSelectByLabel(page, 'SSL Protocols', 'TLSv1.2');
    await uiSelectByLabel(page, 'SSL Protocols', 'TLSv1.3');

    // Submit the form
    await sslsPom.getAddBtn(page).click();
    await uiHasToastMsg(page, {
      hasText: 'SSL created and verified',
    });

    // Navigate back to list
    await sslsPom.isIndexPage(page);
  });

  await test.step('navigate to detail and verify all fields', async () => {
    // Click View to go to detail page
    const firstSni = snis[0];
    await page
      .getByRole('row', { name: firstSni })
      .getByRole('link', { name: new RegExp(firstSni) })
      .click();
    await sslsPom.isDetailPage(page);

    // Verify ID exists
    const ID = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(ID).toBeVisible();
    await expect(ID).toBeDisabled();

    // Verify SNIs
    for (const sniValue of snis) {
      await expect(page.getByText(sniValue, { exact: true })).toBeVisible();
    }

    // Verify certificate
    const cert1Field = page.getByRole('textbox', { name: 'Certificate 1' });
    await expect(cert1Field).toBeVisible();
    // Verify Status
    await expect(
      page
        .getByRole('combobox', { name: 'Status' })
        .locator(
          'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
        )
    ).toContainText('Enabled');

    // Verify SSL Protocols
    await expect(
      page
        .getByRole('combobox', { name: 'SSL Protocols' })
        .locator(
          'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
        )
    ).toContainText('TLSv1.2');
    await expect(
      page
        .getByRole('combobox', { name: 'SSL Protocols' })
        .locator(
          'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
        )
    ).toContainText('TLSv1.3');

    // Verify Labels
    await uiCheckLabels(page, initialLabels);
  });

  await test.step('edit and update SSL in detail page', async () => {
    const cert1Field = page.getByRole('textbox', { name: 'Certificate 1' });
    await expect(cert1Field).toBeEnabled();

    const updatedSni = 'updated-full.example.com';
    await uiSelectByLabel(page, 'SNIs', updatedSni);
    await page.getByRole('textbox', { name: 'Private Key 1' }).fill(key);

    const saveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/apisix/admin/ssls/')
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
      cert,
      key,
      snis: [...snis, updatedSni],
      labels: initialLabels,
      status: 1,
      ssl_protocols: ['TLSv1.2', 'TLSv1.3'],
    });
    expect(requestPayload).not.toHaveProperty('id');
    expect(requestPayload).not.toHaveProperty('create_time');
    expect(requestPayload).not.toHaveProperty('update_time');
    expect(requestPayload).not.toHaveProperty('validity_start');
    expect(requestPayload).not.toHaveProperty('validity_end');

    await uiHasToastMsg(page, {
      hasText: 'SSL saved and reloaded from APISIX',
    });
    await sslsPom.isDetailPage(page);
    await page.keyboard.press('Escape').catch(() => {});
    await expect(
      page
        .getByRole('combobox', { name: 'SNIs' })
        .locator(
          'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
        )
    ).toContainText(updatedSni);

    await sslsPom.getSSLNavBtn(page).click();
    await sslsPom.isIndexPage(page);
  });

  await test.step('delete SSL in detail page', async () => {
    // Navigate to detail page
    const firstSni = snis[0];
    await page
      .getByRole('row', { name: firstSni })
      .getByRole('link', { name: new RegExp(firstSni) })
      .click();
    await sslsPom.isDetailPage(page);

    // Delete the SSL
    await page.getByRole('button', { name: 'Delete' }).click();

    await page
      .getByRole('dialog', { name: 'Delete SSL' })
      .getByRole('button', { name: 'Delete' })
      .click();

    // Will redirect to SSLs page
    await sslsPom.isIndexPage(page);
    await uiHasToastMsg(page, {
      hasText: 'SSL deleted successfully',
    });
    await expect(page.getByRole('cell', { name: firstSni })).toBeHidden();

    // Final verification: Reload the page and check again
    await page.reload();
    await page.waitForLoadState('load');
    await sslsPom.isIndexPage(page);

    // After reload, the SSL should still be gone
    await expect(page.getByRole('cell', { name: firstSni })).toBeHidden();
  });
});
