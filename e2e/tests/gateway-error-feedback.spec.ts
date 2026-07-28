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
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('settings:adminKey', JSON.stringify('test-admin-key'));
  });
  await page.route('**/apisix/admin/**', async (route) => {
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error_msg: 'upstream unavailable' }),
    });
  });
});

test('keeps dashboard collection failures in the inline partial-data state', async ({
  page,
}) => {
  await page.goto('dashboard');

  await expect(page.getByText('Partial gateway data')).toBeVisible();
  await expect(
    page.getByText('12 Admin API collections could not be loaded.')
  ).toBeVisible();
  await expect(page.locator('.ant-notification-notice')).toHaveCount(0);
  const activityBadge = page
    .getByRole('button', { name: 'Activity Log' })
    .locator('xpath=..');
  await expect(activityBadge.locator('.ant-badge-count')).toHaveCount(0);
});

test('groups concurrent server failures into one activity and notification', async ({
  page,
}) => {
  await page.goto('topology');

  await expect(page.getByText('Topology unavailable')).toBeVisible();
  await expect(page.locator('.ant-notification-notice')).toHaveCount(1);
  const activityBadge = page
    .getByRole('button', { name: 'Activity Log' })
    .locator('xpath=..');
  await expect(activityBadge.locator('.ant-badge-count')).toHaveText('1');
});
