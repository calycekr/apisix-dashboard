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
import { uiGoto, uiHasToastMsg } from '@e2e/utils/ui';
import { expect } from '@playwright/test';

import { getUpstreamReq } from '@/apis/upstreams';
import { API_UPSTREAMS } from '@/config/constant';

const upstreamId = randomId('kafka-upstream');

test.beforeAll(async () => {
  await e2eReq.put(`${API_UPSTREAMS}/${upstreamId}`, {
    name: 'Kafka upstream',
    nodes: {
      '127.0.0.1:9092': 1,
    },
    scheme: 'kafka',
    type: 'roundrobin',
  });
});

test.afterAll(async () => {
  await e2eReq.delete(`${API_UPSTREAMS}/${upstreamId}`);
});

test('edits an APISIX Kafka upstream without rejecting its scheme', async ({
  page,
}) => {
  await uiGoto(page, '/upstreams/detail/$id', { id: upstreamId });

  const schemeSelect = page
    .getByRole('combobox', { name: 'Scheme' })
    .locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]'
    );
  await expect(schemeSelect).toContainText('kafka');
  await schemeSelect.click();
  await expect(
    page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="kafka"]')
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByLabel('Description').fill('Kafka upstream updated in dashboard');
  await page.getByRole('button', { name: 'Save' }).click();
  await page
    .getByRole('dialog', { name: 'Review Changes Before Saving' })
    .getByRole('button', { name: 'Confirm & Save' })
    .click();

  await uiHasToastMsg(page, {
    hasText: 'Upstream saved and reloaded from APISIX',
  });

  const upstream = (await getUpstreamReq(e2eReq, upstreamId)).value;
  expect(upstream.scheme).toBe('kafka');
  expect(upstream.desc).toBe('Kafka upstream updated in dashboard');
});
