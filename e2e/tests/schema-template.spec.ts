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

import { buildJsonSchemaTemplate } from '@/components/schema-form/schemaTemplate';
import {
  type JSONSchema,
  validateSchemaValue,
} from '@/components/schema-form/schemaValidation';

const positiveIntegerOrString: JSONSchema = {
  oneOf: [
    { type: 'integer', exclusiveMinimum: 0 },
    { type: 'string' },
  ],
};

test('builds a minimal template for union-based plugin required fields', () => {
  const limitCountSchema: JSONSchema = {
    type: 'object',
    oneOf: [
      { required: ['count', 'time_window'] },
      { required: ['rules'] },
    ],
    properties: {
      count: positiveIntegerOrString,
      time_window: positiveIntegerOrString,
      rules: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['count', 'time_window', 'key'],
          properties: {
            count: positiveIntegerOrString,
            time_window: positiveIntegerOrString,
            key: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  };

  const template = buildJsonSchemaTemplate(limitCountSchema);

  expect(template).toEqual({
    count: 1,
    time_window: 1,
  });
  expect(validateSchemaValue(limitCountSchema, template)).toEqual([]);
});

test('fills conditional plugin requirements from the selected branch', () => {
  const redisLimitCountSchema: JSONSchema = {
    type: 'object',
    properties: {
      policy: {
        type: 'string',
        enum: ['local', 'redis-sentinel'],
        default: 'local',
      },
    },
    if: {
      properties: {
        policy: { enum: ['redis-sentinel'] },
      },
    },
    then: {
      required: ['redis_sentinels', 'redis_master_name'],
      properties: {
        redis_sentinels: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['host', 'port'],
            properties: {
              host: { type: 'string', minLength: 2 },
              port: { type: 'integer', minimum: 1 },
            },
          },
        },
        redis_master_name: { type: 'string', minLength: 1 },
      },
    },
  };

  const template = buildJsonSchemaTemplate(redisLimitCountSchema, {
    policy: 'redis-sentinel',
  });

  expect(template).toEqual({
    policy: 'redis-sentinel',
    redis_sentinels: [
      {
        host: 'value',
        port: 1,
      },
    ],
    redis_master_name: 'value',
  });
  expect(validateSchemaValue(redisLimitCountSchema, template)).toEqual([]);
});

test('creates required array items for multi-instance plugin schemas', () => {
  const aiProxyMultiSchema: JSONSchema = {
    type: 'object',
    required: ['instances'],
    properties: {
      instances: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'provider', 'auth', 'weight'],
          properties: {
            name: { type: 'string', minLength: 1 },
            provider: { type: 'string', minLength: 1 },
            auth: {
              type: 'object',
              additionalProperties: false,
            },
            weight: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
  };

  const template = buildJsonSchemaTemplate(aiProxyMultiSchema);

  expect(template).toEqual({
    instances: [
      {
        name: 'value',
        provider: 'value',
        auth: {},
        weight: 0,
      },
    ],
  });
  expect(validateSchemaValue(aiProxyMultiSchema, template)).toEqual([]);
});
