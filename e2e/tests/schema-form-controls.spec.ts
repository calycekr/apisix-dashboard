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

import { getSchemaControlKind } from '../../src/components/schema-form/schemaControls';
import { getSchemaProperties } from '../../src/components/schema-form/schemaValidation';

test('maps common plugin schema types to fast form controls', () => {
  expect(
    getSchemaControlKind('provider', {
      type: 'string',
      enum: ['openai', 'bedrock'],
    })
  ).toBe('select');
  expect(getSchemaControlKind('enabled', { type: 'boolean' })).toBe('boolean');
  expect(getSchemaControlKind('timeout', { type: 'integer' })).toBe('number');
  expect(getSchemaControlKind('spec_url', { type: 'string', format: 'uri' })).toBe(
    'url'
  );
  expect(getSchemaControlKind('admin_email', { type: 'string', format: 'email' })).toBe(
    'email'
  );
});

test('uses appropriate controls for secrets and multiline configuration', () => {
  expect(getSchemaControlKind('client_secret', { type: 'string' })).toBe(
    'password'
  );
  expect(getSchemaControlKind('secret_access_key', { type: 'string' })).toBe(
    'password'
  );
  expect(getSchemaControlKind('idp_metadata', { type: 'string' })).toBe(
    'textarea'
  );
  expect(getSchemaControlKind('spec', { type: 'string' })).toBe('textarea');
  expect(getSchemaControlKind('response_body', { type: 'string' })).toBe(
    'textarea'
  );
});

test('maps arrays to multiple selection, typed rows, or object cards', () => {
  expect(
    getSchemaControlKind('methods', {
      type: 'array',
      items: { type: 'string', enum: ['GET', 'POST'] },
    })
  ).toBe('multi-select');
  expect(
    getSchemaControlKind('statuses', {
      type: 'array',
      items: { type: 'integer' },
    })
  ).toBe('scalar-array');
  expect(
    getSchemaControlKind('rules', {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    })
  ).toBe('object-array');
});

test('renders fixed pattern sections as fields and dynamic maps as JSON', () => {
  const authSchema = {
    type: 'object',
    patternProperties: {
      header: { type: 'object', additionalProperties: { type: 'string' } },
      query: { type: 'object', additionalProperties: { type: 'string' } },
      aws: {
        type: 'object',
        properties: {
          access_key_id: { type: 'string' },
          secret_access_key: { type: 'string' },
        },
      },
    },
    additionalProperties: false,
  };

  expect(Object.keys(getSchemaProperties(authSchema))).toEqual([
    'header',
    'query',
    'aws',
  ]);
  expect(getSchemaControlKind('auth', authSchema)).toBe('object');
  expect(
    getSchemaControlKind('headers', {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9._-]+$': { type: 'string' },
      },
    })
  ).toBe('json');
});
