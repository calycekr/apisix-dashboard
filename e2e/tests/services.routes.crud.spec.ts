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
import { expect } from '@playwright/test';

import { deleteAllRoutes, getRouteReq } from '@/apis/routes';
import { deleteAllServices, postServiceReq } from '@/apis/services';

test.describe.configure({ mode: 'serial' });

const serviceName = randomId('test-service');
const routeName = randomId('test-route');
const routeUri = '/test-route';
let testServiceId: string;
let testRouteId: string;

test.beforeAll(async () => {
  await deleteAllRoutes(e2eReq);
  await deleteAllServices(e2eReq);

  // Create a test service for testing service routes
  const serviceResponse = await postServiceReq(e2eReq, {
    name: serviceName,
    desc: 'Test service for route testing',
  });

  testServiceId = serviceResponse.data.value.id;
});

test.afterAll(async () => {
  await deleteAllRoutes(e2eReq);
  await deleteAllServices(e2eReq);
});

test('should CRUD route under service with required fields', async ({
  page,
}) => {
  // Navigate to service detail page
  await servicesPom.toIndex(page);
  await servicesPom.isIndexPage(page);

  // Click on the service to go to detail page
  await page
    .getByRole('row', { name: serviceName })
    .getByRole('link', { name: serviceName, exact: true })
    .click();
  await servicesPom.isDetailPage(page);

  // Navigate to Routes tab
  await servicesPom.getServiceRoutesTab(page).click();
  await servicesPom.isServiceRoutesPage(page);

  await servicesPom.getAddRouteBtn(page).click();
  await servicesPom.isServiceRouteAddPage(page);

  await test.step('cannot submit without required fields', async () => {
    await servicesPom.getAddBtn(page).click();
    await servicesPom.isServiceRouteAddPage(page);
    await expect(page.getByRole('alert').first()).toContainText(
      '1 validation error'
    );
    await expect(
      page.getByRole('button', { name: /Request Path \(URI\)/ })
    ).toBeVisible();
  });

  await test.step('submit with required fields', async () => {
    // Fill in the Name field
    await page.getByLabel('Name', { exact: true }).first().fill(routeName);
    await page.getByLabel('URI', { exact: true }).fill(routeUri);

    await uiSelectByLabel(page, 'HTTP Methods', 'GET');

    await expect(
      page.getByRole('combobox', { name: 'Service ID' }).locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
      )
    ).toContainText(testServiceId);

    // Submit the form
    await servicesPom.getAddBtn(page).click();
    await uiHasToastMsg(page, {
      hasText: 'Route created and verified',
    });
  });

  await test.step('auto navigate to route detail page', async () => {
    await servicesPom.isServiceRouteDetailPage(page);
    testRouteId = page.url().split('/').pop() ?? '';
    const route = (await getRouteReq(e2eReq, testRouteId)).value;
    expect(route.service_id).toBe(testServiceId);

    // Verify the route details
    // Verify ID exists
    const ID = page.getByRole('textbox', { name: 'ID', exact: true });
    await expect(ID).toBeVisible();
    await expect(ID).toBeDisabled();

    // Verify the route name
    const name = page.getByLabel('Name', { exact: true }).first();
    await expect(name).toHaveValue(routeName);

    // Verify the route URI
    const uri = page.getByLabel('URI', { exact: true });
    await expect(uri).toHaveValue(routeUri);

    await expect(
      page.getByRole('combobox', { name: 'Service ID' }).locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
      )
    ).toContainText(testServiceId);
  });

  await test.step('edit and update route in detail page', async () => {
    const nameField = page.getByLabel('Name', { exact: true }).first();
    await expect(nameField).toBeEnabled();

    // Update the description field
    const descriptionField = page.getByLabel('Description').first();
    await descriptionField.fill('Updated description for testing');

    // Update URI
    const uriField = page.getByLabel('URI', { exact: true });
    await uriField.fill(`${routeUri}-updated`);

    // Click the Save button to save changes
    const saveBtn = page.getByRole('button', { name: 'Save' });
    await saveBtn.click();
    await page
      .getByRole('dialog', { name: 'Review Changes Before Saving' })
      .getByRole('button', { name: 'Confirm & Save' })
      .click();
    await expect(page.getByText('No pending changes')).toBeVisible({
      timeout: 30000,
    });

    // Verify we're back in detail view mode
    await servicesPom.isServiceRouteDetailPage(page);
    const route = (await getRouteReq(e2eReq, testRouteId)).value;
    expect(route.service_id).toBe(testServiceId);

    // Verify the updated fields
    // Verify description
    await expect(page.getByLabel('Description').first()).toHaveValue(
      'Updated description for testing'
    );

    // Check if the updated URI is visible
    await expect(page.getByLabel('URI', { exact: true })).toHaveValue(
      `${routeUri}-updated`
    );
  });

  await test.step('route should exist in service routes list', async () => {
    // Navigate back to service routes list
    await servicesPom.toServiceRoutes(page, testServiceId);
    await servicesPom.isServiceRoutesPage(page);

    await expect(page.getByRole('cell', { name: routeName })).toBeVisible();

    // Click on the route name to go to the detail page
    await page
      .getByRole('row', { name: routeName })
      .getByRole('link', { name: routeName, exact: true })
      .click();
    await servicesPom.isServiceRouteDetailPage(page);
  });

  await test.step('delete route in detail page', async () => {
    // We're already on the detail page from the previous step

    // Delete the route
    await page.getByRole('button', { name: 'Delete' }).click();

    await page
      .getByRole('dialog', { name: 'Delete Route' })
      .getByRole('button', { name: 'Delete' })
      .click();

    // Will redirect to service routes page
    await servicesPom.isServiceRoutesPage(page);
    await uiHasToastMsg(page, {
      hasText: 'Route deleted successfully',
    });
    await expect(page.getByRole('cell', { name: routeName })).toBeHidden();
  });
});
