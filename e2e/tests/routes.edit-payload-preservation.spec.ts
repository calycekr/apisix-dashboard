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
import { randomId } from '@e2e/utils/common';
import { e2eReq } from '@e2e/utils/req';
import { test } from '@e2e/utils/test';
import { uiFillMonacoEditor, uiGoto } from '@e2e/utils/ui';
import { expect, type Request } from '@playwright/test';

import { deleteAllRoutes, getRouteReq } from '@/apis/routes';
import { API_ROUTES } from '@/config/constant';

const routeId = randomId('route-payload-preserve');
const routeUri = '/route-payload-preserve';
const updatedDesc = 'updated through form while preserving raw payload';
const rawDraftDesc = 'raw json draft that will fail once';
const rawLatestDesc = 'latest server value after failed raw save';

const readMonacoValue = async (page: Parameters<typeof uiGoto>[0]) =>
  page.evaluate(() => window.__monacoEditor__?.getValue() ?? '');

test.beforeAll(async () => {
  await deleteAllRoutes(e2eReq);
  await e2eReq.put(`${API_ROUTES}/${routeId}`, {
    uri: routeUri,
    desc: 'initial description',
    methods: ['GET'],
    plugins: {
      'response-rewrite': {
        body: 'initial response body',
        headers: {
          'X-Preserved-Header': 'preserved-value',
        },
      },
    },
  });
});

test.afterAll(async () => {
  await deleteAllRoutes(e2eReq);
});

test('route form save preserves raw payload and strips readonly fields', async ({
  page,
}) => {
  await uiGoto(page, '/routes/detail/$id', { id: routeId });

  const tabs = page.getByRole('tablist');
  await expect(tabs.getByRole('tab', { name: 'Configuration' })).toHaveAttribute(
    'aria-selected',
    'true'
  );

  await page.getByLabel('Description').first().fill(updatedDesc);

  let capturedRequest: Request | undefined;
  const putRequest = page.waitForRequest((request) => {
    const url = request.url();
    const isTargetRoute = url.includes(`${API_ROUTES}/${routeId}`);
    const isPut = request.method() === 'PUT';
    if (isTargetRoute && isPut) {
      capturedRequest = request;
      return true;
    }
    return false;
  });

  await page.getByRole('button', { name: 'Save' }).click();
  await page
    .getByRole('dialog', { name: 'Review Changes Before Saving' })
    .getByRole('button', { name: 'Confirm & Save' })
    .click();
  await putRequest;
  await expect(page.getByText('No pending changes')).toBeVisible({
    timeout: 30000,
  });

  const body = capturedRequest?.postDataJSON() as Record<string, unknown>;
  expect(body).toBeDefined();
  expect(body.id).toBeUndefined();
  expect(body.create_time).toBeUndefined();
  expect(body.update_time).toBeUndefined();
  expect(body.desc).toBe(updatedDesc);
  expect(body.plugins).toEqual({
    'response-rewrite': {
      body: 'initial response body',
      headers: {
        'X-Preserved-Header': 'preserved-value',
      },
    },
  });

  const route = (await getRouteReq(e2eReq, routeId)).value;
  expect(route.desc).toBe(updatedDesc);
  expect(route.plugins?.['response-rewrite']).toEqual({
    body: 'initial response body',
    headers: {
      'X-Preserved-Header': 'preserved-value',
    },
  });
});

test('raw JSON save failure offers reset and reload recovery actions', async ({
  page,
}) => {
  await uiGoto(page, '/routes/detail/$id', { id: routeId });
  await page.getByRole('tab', { name: 'Raw JSON' }).click();

  const rawJsonPanel = page.getByRole('tabpanel', { name: 'Raw JSON' });
  const editor = rawJsonPanel.locator('.monaco-editor').first();
  await expect(editor).toBeVisible();
  await uiFillMonacoEditor(
    page,
    editor,
    JSON.stringify({
      uri: routeUri,
      desc: rawDraftDesc,
    })
  );

  let patchAttempts = 0;
  await page.route(`**${API_ROUTES}/${routeId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      patchAttempts += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error_msg: 'temporary raw save failure' }),
      });
      return;
    }
    await route.continue();
  });

  await page.getByRole('button', { name: 'Save Changes' }).click();

  await expect(
    page.getByRole('alert').filter({ hasText: 'Save failed' }).first()
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset draft' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload latest' })).toBeVisible();
  expect(patchAttempts).toBe(1);

  await e2eReq.put(`${API_ROUTES}/${routeId}`, {
    uri: routeUri,
    desc: rawLatestDesc,
    methods: ['GET'],
    plugins: {
      'response-rewrite': {
        body: 'latest response body',
      },
    },
  });

  await page.getByRole('button', { name: 'Reload latest' }).click();
  await expect
    .poll(() => readMonacoValue(page))
    .toContain(`"desc": "${rawLatestDesc}"`);
});
