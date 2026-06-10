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
  buildConfigValidationPayload,
  type ExportData,
} from '../../src/apis/export-import';
import { selectPluginNamesWithSchema } from '../../src/apis/plugins';
import {
  getActiveRequiredFields,
  getSchemaProperties,
  type JSONSchema,
  validateSchemaValue,
} from '../../src/components/schema-form/schemaValidation';

const aiProxySchema: JSONSchema = {
  type: 'object',
  required: ['provider', 'auth'],
  properties: {
    provider: {
      type: 'string',
      enum: ['openai', 'bedrock'],
    },
    auth: {
      type: 'object',
      properties: {
        aws: {
          type: 'object',
          required: ['access_key_id', 'secret_access_key'],
          properties: {
            access_key_id: { type: 'string', minLength: 1 },
            secret_access_key: { type: 'string', minLength: 1 },
            session_token: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    options: {
      type: 'object',
      properties: {
        model: { type: 'string' },
      },
      additionalProperties: true,
    },
    override: {
      type: 'object',
      properties: {
        llm_options: {
          type: 'object',
          additionalProperties: false,
          properties: {
            max_tokens: { type: 'integer', minimum: 1 },
          },
        },
        request_body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            'bedrock-converse': {
              type: 'object',
              additionalProperties: true,
            },
            passthrough: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
        request_body_force_override: {
          type: 'boolean',
          default: false,
        },
      },
    },
    max_req_body_size: { type: 'integer', minimum: 1 },
    max_stream_duration_ms: { type: 'integer', minimum: 1 },
    max_response_bytes: { type: 'integer', minimum: 1 },
  },
};

const aiProxyMultiSchema: JSONSchema = {
  type: 'object',
  required: ['instances'],
  properties: {
    instances: {
      type: 'array',
      minItems: 1,
      items: aiProxySchema,
    },
    fallback_strategy: {
      anyOf: [
        {
          type: 'string',
          enum: [
            'instance_health_and_rate_limiting',
            'http_429',
            'http_5xx',
          ],
        },
        {
          type: 'array',
          items: {
            type: 'string',
            enum: ['rate_limiting', 'http_429', 'http_5xx'],
          },
        },
      ],
    },
    max_retries: { type: 'integer', minimum: 0 },
    retry_on_failure_within_ms: { type: 'integer', minimum: 1 },
  },
};

const openIdConnectSchema: JSONSchema = {
  type: 'object',
  required: ['client_id'],
  properties: {
    client_id: { type: 'string' },
    client_secret: { type: 'string' },
    bearer_only: { type: 'boolean', default: false },
    use_jwks: { type: 'boolean', default: false },
    session: {
      type: 'object',
      required: ['secret'],
      additionalProperties: false,
      properties: {
        secret: { type: 'string', minLength: 16 },
        cookie_name: { type: 'string' },
        cookie_same_site: {
          type: 'string',
          enum: ['Strict', 'Lax', 'None', 'Default'],
        },
        absolute_timeout: { type: 'integer' },
        storage: {
          type: 'string',
          enum: ['cookie', 'redis'],
          default: 'cookie',
        },
        redis: {
          type: 'object',
          properties: {
            host: { type: 'string', minLength: 2 },
            port: { type: 'integer', minimum: 1 },
          },
        },
      },
      if: {
        properties: {
          storage: { enum: ['redis'] },
        },
      },
      then: {
        required: ['redis'],
      },
    },
  },
};

const proxyCacheSchema: JSONSchema = {
  type: 'object',
  properties: {
    consumer_isolation: { type: 'boolean', default: true },
    cache_set_cookie: { type: 'boolean', default: false },
    cache_http_status: {
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'integer',
        minimum: 200,
        maximum: 599,
      },
    },
  },
};

const batchRequestsMetadataSchema: JSONSchema = {
  type: 'object',
  properties: {
    max_body_size: {
      type: 'integer',
      exclusiveMinimum: 0,
    },
    max_pipeline_items: {
      type: 'integer',
      exclusiveMinimum: 0,
    },
  },
};

test('supports the latest AI Gateway configuration surface', () => {
  const config = {
    provider: 'bedrock',
    auth: {
      aws: {
        access_key_id: '$secret://vault/aws/access-key',
        secret_access_key: '$secret://vault/aws/secret-key',
      },
    },
    options: {
      model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      region: 'us-east-1',
    },
    override: {
      llm_options: {
        max_tokens: 1024,
      },
      request_body: {
        'bedrock-converse': {
          inferenceConfig: {
            temperature: 0.2,
          },
        },
        passthrough: {
          custom_field: true,
        },
      },
      request_body_force_override: true,
    },
    max_req_body_size: 67108864,
    max_stream_duration_ms: 120000,
    max_response_bytes: 10485760,
  };

  expect(validateSchemaValue(aiProxySchema, config)).toEqual([]);
  expect(
    Object.keys(getSchemaProperties(aiProxySchema, aiProxySchema, config))
  ).toEqual(
    expect.arrayContaining([
      'provider',
      'auth',
      'options',
      'override',
      'max_req_body_size',
      'max_stream_duration_ms',
      'max_response_bytes',
    ])
  );
});

test('supports ai-proxy-multi bounded fallback configuration', () => {
  expect(
    validateSchemaValue(aiProxyMultiSchema, {
      instances: [
        {
          provider: 'openai',
          auth: {},
        },
      ],
      fallback_strategy: ['rate_limiting', 'http_5xx'],
      max_retries: 2,
      retry_on_failure_within_ms: 500,
    })
  ).toEqual([]);

  expect(
    validateSchemaValue(aiProxyMultiSchema, {
      instances: [],
      max_retries: -1,
      retry_on_failure_within_ms: 0,
    })
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('instances'),
      expect.stringContaining('max_retries'),
      expect.stringContaining('retry_on_failure_within_ms'),
    ])
  );
});

test('supports OIDC session 4.x fields and optional client secret', () => {
  const localJwtConfig = {
    client_id: 'dashboard',
    bearer_only: true,
    use_jwks: true,
    session: {
      secret: '0123456789abcdef',
      cookie_name: 'apisix_session',
      cookie_same_site: 'Lax',
      absolute_timeout: 3600,
      storage: 'redis',
      redis: {
        host: 'redis.internal',
        port: 6379,
      },
    },
  };

  expect(validateSchemaValue(openIdConnectSchema, localJwtConfig)).toEqual([]);
  expect(
    getActiveRequiredFields(
      openIdConnectSchema.properties?.session ?? {},
      localJwtConfig.session,
      openIdConnectSchema
    )
  ).toEqual(expect.arrayContaining(['secret', 'redis']));
});

test('supports proxy cache safety options and typed status arrays', () => {
  expect(
    validateSchemaValue(proxyCacheSchema, {
      consumer_isolation: true,
      cache_set_cookie: false,
      cache_http_status: [200, 301, 404],
    })
  ).toEqual([]);
  expect(
    validateSchemaValue(proxyCacheSchema, {
      cache_http_status: [200, 200, 700],
    })
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('unique'),
      expect.stringContaining('cache_http_status[2]'),
    ])
  );
});

test('supports batch request metadata limits', () => {
  expect(
    validateSchemaValue(batchRequestsMetadataSchema, {
      max_body_size: 1048576,
      max_pipeline_items: 1000,
    })
  ).toEqual([]);
  expect(
    validateSchemaValue(batchRequestsMetadataSchema, {
      max_pipeline_items: 0,
    })
  ).toContainEqual(expect.stringContaining('max_pipeline_items'));
});

test('maps dashboard exports to the APISIX config validation endpoint', () => {
  const exportData: ExportData = {
    version: 2,
    exportedAt: '2026-06-11T00:00:00.000Z',
    resources: {
      upstreams: [{ id: 'upstream-1' }],
      services: [{ id: 'service-1' }],
      routes: [{ id: 'route-1' }],
      streamRoutes: [{ id: 'stream-route-1' }],
      consumers: [{ username: 'consumer-1' }],
      credentials: [
        {
          id: 'credential-1',
          username: 'consumer-1',
          plugins: { 'key-auth': { key: 'secret-reference' } },
        },
      ],
      consumerGroups: [{ id: 'group-1' }],
      ssls: [{ id: 'ssl-1' }],
      globalRules: [{ id: 'rule-1' }],
      pluginConfigs: [{ id: 'plugin-config-1' }],
      pluginMetadata: [
        {
          id: 'batch-requests',
          max_body_size: 1048576,
          max_pipeline_items: 1000,
        },
      ],
      protos: [{ id: 'proto-1' }],
      secrets: [{ id: 'secret-1', manager: 'vault' }],
    },
  };

  expect(
    buildConfigValidationPayload(exportData, [
      'streamRoutes',
      'consumerGroups',
      'pluginConfigs',
      'credentials',
      'pluginMetadata',
    ])
  ).toEqual({
    stream_routes: [{ id: 'stream-route-1' }],
    consumer_groups: [{ id: 'group-1' }],
    plugin_configs: [{ id: 'plugin-config-1' }],
    consumers: [
      {
        id: 'consumer-1/credentials/credential-1',
        plugins: { 'key-auth': { key: 'secret-reference' } },
      },
    ],
    plugin_metadata: [
      {
        id: 'batch-requests',
        max_body_size: 1048576,
        max_pipeline_items: 1000,
      },
    ],
  });
});

test('discovers every recently added plugin dynamically from APISIX', () => {
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
  const response = Object.fromEntries(
    recentPlugins.map((name) => [
      name,
      {
        schema: {
          type: 'object',
        },
      },
    ])
  );

  expect(selectPluginNamesWithSchema(response, 'schema')).toEqual(
    recentPlugins
  );
});
