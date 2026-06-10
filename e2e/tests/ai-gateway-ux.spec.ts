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

import {
  getAIGatewayTemplates,
  validateAIGatewayConfig,
} from '../../src/components/form-slice/FormItemPlugins/aiGateway';
import { getPluginCategory } from '../../src/components/form-slice/FormItemPlugins/utils';

test('provides safe quick starts for AI Gateway providers', () => {
  const templates = getAIGatewayTemplates('ai-proxy');
  expect(templates.map((template) => template.key)).toEqual([
    'openai',
    'bedrock',
    'openai-compatible',
  ]);

  for (const template of templates) {
    expect(validateAIGatewayConfig('ai-proxy', template.config)).toEqual([]);
  }
});

test('provides a bounded multi-provider fallback quick start', () => {
  const [template] = getAIGatewayTemplates('ai-proxy-multi');
  expect(template.config).toMatchObject({
    max_retries: 1,
    retry_on_failure_within_ms: 3000,
  });
  expect(validateAIGatewayConfig('ai-proxy-multi', template.config)).toEqual([]);
});

test('reports provider-specific requirements before route submission', () => {
  expect(
    validateAIGatewayConfig('ai-proxy', {
      provider: 'bedrock',
      auth: {},
    })
  ).toEqual([
    'provider_conf.region is required for Bedrock.',
    'auth.aws is required for Bedrock.',
  ]);

  expect(
    validateAIGatewayConfig('ai-proxy', {
      provider: 'openai-compatible',
      auth: {},
    })
  ).toEqual([
    'override.endpoint is required for an OpenAI-compatible provider.',
  ]);
});

test('groups AI plugins in a dedicated marketplace category', () => {
  expect(getPluginCategory('ai-proxy')).toMatchObject({
    name: 'AI Gateway',
    color: 'geekblue',
  });
  expect(getPluginCategory('ai-proxy-multi')).toMatchObject({
    name: 'AI Gateway',
  });
});
