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
import { uiHasToastMsg, uiSelectByLabel } from '@e2e/utils/ui';
import { uiDeleteRoute } from '@e2e/utils/ui/routes';
import { expect, type Page } from '@playwright/test';

import { deleteAllRoutes, getRouteReq } from '@/apis/routes';
import { deleteAllServices, postServiceReq } from '@/apis/services';
import { deleteAllUpstreams, postUpstreamReq } from '@/apis/upstreams';
import type { APISIXType } from '@/types/schema/apisix';

const upstreamName = randomId('test-upstream');
const serviceName = randomId('test-service');
const routeNameForUpstreamId = randomId('test-route-upstream-id');
const routeNameForServiceId = randomId('test-route-service-id');
const routeUri1 = '/test-route-upstream-id';
const routeUri2 = '/test-route-service-id';

const upstreamNodes: APISIXType['UpstreamNode'][] = [
  { host: 'test.com', port: 80, weight: 100 },
  { host: 'test2.com', port: 80, weight: 100 },
];

let testUpstreamId: string;
let testServiceId: string;

test.describe.configure({ mode: 'serial' });

// Common helper functions
async function fillBasicRouteFields(
  page: Page,
  routeName: string,
  routeUri: string,
  method: string
) {
  await page.locator('input[name="name"]').fill(routeName);
  await page.locator('input[name="uri"]').fill(routeUri);

  await uiSelectByLabel(page, 'HTTP Methods', method);
}

async function selectTargetMode(page: Page, label: string) {
  await page
    .getByRole('radiogroup')
    .getByText(label, { exact: true })
    .click();
}

async function fillInlineUpstreamFields(
  page: Page,
  upstreamName: string,
  upstreamDesc: string
) {
  await selectTargetMode(page, 'Define inline Upstream');
  const inlineTarget = page.getByRole('group', {
    name: 'Inline Upstream target',
  });

  await inlineTarget.getByLabel('Name', { exact: true }).fill(upstreamName);
  await inlineTarget.getByLabel('Description').fill(upstreamDesc);
  await inlineTarget.getByRole('button', { name: 'Add a Node' }).click();
  await inlineTarget
    .getByRole('textbox', { name: 'Host', exact: true })
    .fill(upstreamNodes[0].host);
  await inlineTarget
    .getByRole('spinbutton', { name: 'Port' })
    .fill(String(upstreamNodes[0].port));
  await inlineTarget
    .getByRole('spinbutton', { name: 'Weight' })
    .fill(String(upstreamNodes[0].weight));

  return inlineTarget;
}

async function verifyRouteData(
  page: Page,
  expectedIdField: 'upstream_id' | 'service_id',
  expectedIdValue: string
) {
  await routesPom.isDetailPage(page);

  // Get the route ID from URL
  const url = page.url();
  const routeId = url.split('/').pop();
  expect(routeId).toBeDefined();

  // Fetch route data via API to verify the upstream field was cleared
  const routeResponse = await getRouteReq(e2eReq, routeId!);
  const routeData = routeResponse.value;

  // Verify the expected ID field is preserved
  expect(routeData[expectedIdField]).toBe(expectedIdValue);

  // Verify upstream field is cleared (should be undefined or empty)
  expect(routeData.upstream).toBeUndefined();

  const label = expectedIdField === 'service_id' ? 'Service ID' : 'Upstream ID';
  await expect(
    page.getByRole('combobox', { name: label }).locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
    )
  ).toContainText(expectedIdValue);

  return routeId!;
}

async function editRouteAndAddUpstream(
  page: Page,
  upstreamName: string,
  upstreamDesc: string
) {
  const nameField = page.getByLabel('Name', { exact: true }).first();
  await expect(nameField).toBeEnabled();

  await fillInlineUpstreamFields(page, upstreamName, upstreamDesc);
}

async function saveRouteChanges(page: Page) {
  await page.getByRole('button', { name: 'Save' }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Review Changes Before Saving',
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm & Save' }).click();
  await expect(page.getByText('No pending changes')).toBeVisible({
    timeout: 30000,
  });
}

test.beforeAll(async () => {
  // Clean up existing resources
  await deleteAllRoutes(e2eReq);
  await deleteAllServices(e2eReq);
  await deleteAllUpstreams(e2eReq);

  // Create a test upstream for testing upstream_id scenario
  const upstreamResponse = await postUpstreamReq(e2eReq, {
    name: upstreamName,
    nodes: upstreamNodes,
  });
  testUpstreamId = upstreamResponse.data.value.id;

  // Create a test service for testing service_id scenario
  const serviceResponse = await postServiceReq(e2eReq, {
    name: serviceName,
    desc: 'Test service for route upstream field clearing',
  });
  testServiceId = serviceResponse.data.value.id;
});

test.afterAll(async () => {
  await deleteAllRoutes(e2eReq);
  await deleteAllServices(e2eReq);
  await deleteAllUpstreams(e2eReq);
});

test('should clear upstream field when upstream_id exists (create and edit)', async ({
  page,
}) => {
  expect(testUpstreamId).toBeTruthy();
  await routesPom.toAdd(page);

  await test.step('create route with both upstream and upstream_id', async () => {
    // Fill basic route fields
    await fillBasicRouteFields(page, routeNameForUpstreamId, routeUri1, 'GET');

    await fillInlineUpstreamFields(
      page,
      'test-upstream-inline',
      'test inline upstream'
    );

    await selectTargetMode(page, 'Use existing Upstream');
    await uiSelectByLabel(page, 'Upstream ID', testUpstreamId);

    await routesPom.getAddBtn(page).click();
    await uiHasToastMsg(page, {
      hasText: 'Route created and verified',
    });
  });

  await test.step('verify upstream field is cleared after creation', async () => {
    await verifyRouteData(page, 'upstream_id', testUpstreamId);
  });

  await test.step('edit route and add upstream configuration again', async () => {
    await editRouteAndAddUpstream(
      page,
      'test-upstream-edit-1',
      'test upstream for editing'
    );
    await selectTargetMode(page, 'Use existing Upstream');
    await uiSelectByLabel(page, 'Upstream ID', testUpstreamId);
    await saveRouteChanges(page);
  });

  await test.step('verify upstream field is still cleared after editing', async () => {
    await verifyRouteData(page, 'upstream_id', testUpstreamId);
    await uiDeleteRoute(page);
  });
});

test('should clear upstream field when service_id exists (create and edit)', async ({
  page,
}) => {
  expect(testServiceId).toBeTruthy();
  await routesPom.toAdd(page);

  await test.step('create route with both upstream and service_id', async () => {
    // Fill basic route fields
    await fillBasicRouteFields(page, routeNameForServiceId, routeUri2, 'GET');

    await fillInlineUpstreamFields(
      page,
      'test-upstream-inline-2',
      'test inline upstream 2'
    );

    await selectTargetMode(page, 'Use Service');
    await uiSelectByLabel(page, 'Service ID', testServiceId);

    await routesPom.getAddBtn(page).click();
    await uiHasToastMsg(page, {
      hasText: 'Route created and verified',
    });
  });

  await test.step('verify upstream field is cleared after creation', async () => {
    await verifyRouteData(page, 'service_id', testServiceId);
  });

  await test.step('edit route and add upstream configuration again', async () => {
    await editRouteAndAddUpstream(
      page,
      'test-upstream-edit-2',
      'test upstream for editing 2'
    );
    await selectTargetMode(page, 'Use Service');
    await uiSelectByLabel(page, 'Service ID', testServiceId);
    await saveRouteChanges(page);
  });

  await test.step('verify upstream field is still cleared after editing', async () => {
    await verifyRouteData(page, 'service_id', testServiceId);
    await uiDeleteRoute(page);
  });
});
