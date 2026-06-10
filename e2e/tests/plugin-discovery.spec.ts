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

import { selectPluginNamesWithSchema } from '../../src/apis/plugins';
import {
  getPluginCatalogEntry,
  getPluginDescription,
  getPluginSearchText,
} from '../../src/components/form-slice/FormItemPlugins/pluginCatalog';
import { getPluginCategory } from '../../src/components/form-slice/FormItemPlugins/utils';
import {
  getSchemaProperties,
  validateSchemaValue,
} from '../../src/components/schema-form/schemaValidation';

const recentPlugins = [
  'proxy-buffering',
  'graphql-proxy-cache',
  'graphql-limit-count',
  'saml-auth',
  'feishu-auth',
  'dingtalk-auth',
  'acl',
  'data-mask',
  'exit-transformer',
  'traffic-label',
  'oas-validator',
  'error-page',
];

test('describes every recently added plugin in user-facing terms', () => {
  for (const name of recentPlugins) {
    expect(getPluginDescription(name)?.length).toBeGreaterThan(20);
    expect(getPluginCatalogEntry(name)?.capabilities.length).toBeGreaterThan(0);
    expect(getPluginCategory(name).name).not.toBe('Others');
  }
});

test('finds plugins by purpose instead of requiring the exact plugin name', () => {
  expect(getPluginSearchText('data-mask')).toContain('sensitive data');
  expect(getPluginSearchText('oas-validator')).toContain('openapi');
  expect(getPluginSearchText('acl')).toContain('access control');
  expect(getPluginSearchText('error-page')).toContain('custom response');
  expect(getPluginSearchText('ai-proxy')).toContain('bedrock');
});

test('prefers current APISIX schema descriptions over catalog fallbacks', () => {
  expect(
    getPluginDescription('data-mask', 'Description supplied by APISIX.')
  ).toBe('Description supplied by APISIX.');
});

test('discovers and validates custom plugins entirely from APISIX schemas', () => {
  const customSchema = {
    type: 'object',
    description: 'Routes requests through a company-specific policy engine.',
    required: ['policy', 'fail_open'],
    properties: {
      policy: {
        type: 'string',
        minLength: 1,
        description: 'Policy identifier.',
      },
      fail_open: {
        type: 'boolean',
        default: false,
      },
      labels: {
        type: 'object',
        additionalProperties: {
          type: 'string',
        },
      },
    },
  };
  const plugins = {
    'company-policy': {
      schema: customSchema,
      consumer_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
        },
      },
      metadata_schema: {
        type: 'object',
        properties: {
          endpoint: { type: 'string', format: 'uri' },
        },
      },
    },
  };

  expect(selectPluginNamesWithSchema(plugins, 'schema')).toEqual([
    'company-policy',
  ]);
  expect(selectPluginNamesWithSchema(plugins, 'consumer_schema')).toEqual([
    'company-policy',
  ]);
  expect(selectPluginNamesWithSchema(plugins, 'metadata_schema')).toEqual([
    'company-policy',
  ]);
  expect(Object.keys(getSchemaProperties(customSchema))).toEqual([
    'policy',
    'fail_open',
    'labels',
  ]);
  expect(
    validateSchemaValue(customSchema, {
      policy: 'strict-internal',
      fail_open: false,
      labels: { environment: 'production' },
    })
  ).toEqual([]);
});
