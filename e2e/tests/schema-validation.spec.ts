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
  getActiveRequiredFields,
  getResolvedSchema,
  getSchemaProperties,
  type JSONSchema,
  validateSchemaValue,
} from '../../src/components/schema-form/schemaValidation';

const aiProxyMultiSchema: JSONSchema = {
  type: 'object',
  required: ['instances'],
  properties: {
    fallback_strategy: {
      anyOf: [
        {
          type: 'string',
          enum: ['sequential', 'round_robin', 'weighted'],
        },
        {
          type: 'array',
          items: {
            type: 'string',
            enum: ['sequential', 'round_robin', 'weighted'],
          },
        },
      ],
    },
    max_retries: {
      type: 'integer',
      minimum: 0,
    },
    retry_on_failure_within_ms: {
      type: 'integer',
      minimum: 1,
    },
    instances: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'provider', 'auth', 'weight'],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
          },
          provider: {
            type: 'string',
          },
          auth: {
            type: 'object',
            patternProperties: {
              '^(header|query)$': {
                type: 'object',
                patternProperties: {
                  '^[a-zA-Z0-9._-]+$': {
                    type: 'string',
                  },
                },
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
          weight: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
    },
  },
};

const openIdConnectSchema: JSONSchema = {
  type: 'object',
  properties: {
    session: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cookie_same_site: {
          type: 'string',
          enum: ['Lax', 'Strict', 'None'],
        },
        absolute_timeout: {
          type: 'integer',
          minimum: 1,
        },
      },
    },
  },
};

const samlSchema: JSONSchema = {
  type: 'object',
  required: ['sp_issuer', 'idp_metadata'],
  properties: {
    sp_issuer: {
      type: 'string',
      minLength: 1,
    },
    idp_metadata: {
      type: 'string',
      minLength: 1,
    },
    secret_fallbacks: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
      },
    },
  },
};

test('accepts current ai-proxy-multi fallback strategies', () => {
  const baseConfig = {
    max_retries: 2,
    retry_on_failure_within_ms: 500,
    instances: [
      {
        name: 'primary',
        provider: 'openai',
        auth: {
          header: {
            Authorization: 'Bearer token',
          },
        },
        weight: 1,
      },
    ],
  };

  expect(
    validateSchemaValue(aiProxyMultiSchema, {
      ...baseConfig,
      fallback_strategy: 'sequential',
    }),
  ).toEqual([]);
  expect(
    validateSchemaValue(aiProxyMultiSchema, {
      ...baseConfig,
      fallback_strategy: ['weighted', 'sequential'],
    }),
  ).toEqual([]);
});

test('rejects invalid ai-proxy-multi unions and nested auth values', () => {
  const issues = validateSchemaValue(aiProxyMultiSchema, {
    fallback_strategy: 1,
    max_retries: -1,
    retry_on_failure_within_ms: 0,
    instances: [
      {
        name: '',
        provider: 'openai',
        auth: {
          header: {
            Authorization: 123,
          },
          unsupported: {},
        },
        weight: -1,
      },
    ],
  });

  expect(issues).toEqual(
    expect.arrayContaining([
      expect.stringContaining('fallback_strategy'),
      expect.stringContaining('max_retries'),
      expect.stringContaining('retry_on_failure_within_ms'),
      expect.stringContaining('instances[0].name'),
      expect.stringContaining('instances[0].auth.header.Authorization'),
      expect.stringContaining('instances[0].auth.unsupported'),
      expect.stringContaining('instances[0].weight'),
    ]),
  );
});

test('enforces nested OpenID Connect session properties', () => {
  expect(
    validateSchemaValue(openIdConnectSchema, {
      session: {
        cookie_same_site: 'Lax',
        absolute_timeout: 3600,
      },
    }),
  ).toEqual([]);

  const issues = validateSchemaValue(openIdConnectSchema, {
    session: {
      cookie_same_site: 'Invalid',
      absolute_timeout: 0,
      unknown: true,
    },
  });

  expect(issues).toEqual(
    expect.arrayContaining([
      expect.stringContaining('session.cookie_same_site'),
      expect.stringContaining('session.absolute_timeout'),
      expect.stringContaining('session.unknown'),
    ]),
  );
});

test('enforces SAML required strings and secret fallback items', () => {
  const issues = validateSchemaValue(samlSchema, {
    sp_issuer: '',
    secret_fallbacks: [''],
  });

  expect(issues).toEqual(
    expect.arrayContaining([
      expect.stringContaining('idp_metadata'),
      expect.stringContaining('sp_issuer'),
      expect.stringContaining('secret_fallbacks[0]'),
    ]),
  );
});

test('enforces APISIX dynamic object property limits', () => {
  expect(
    validateSchemaValue(
      {
        type: 'object',
        minProperties: 1,
        maxProperties: 2,
        additionalProperties: {
          type: 'string',
        },
      },
      {},
    ),
  ).toContainEqual(expect.stringContaining('at least 1 properties'));

  expect(
    validateSchemaValue(
      {
        type: 'object',
        minProperties: 1,
        maxProperties: 2,
        additionalProperties: {
          type: 'string',
        },
      },
      {
        first: 'one',
        second: 'two',
        third: 'three',
      },
    ),
  ).toContainEqual(expect.stringContaining('at most 2 properties'));
});

test('enforces APISIX property and schema dependencies', () => {
  const schema: JSONSchema = {
    type: 'object',
    properties: {
      client_cert: { type: 'string' },
      client_key: { type: 'string' },
      client_cert_id: { type: 'string' },
      algorithm: { type: 'string' },
      secret: { type: 'string' },
    },
    dependencies: {
      client_cert: ['client_key'],
      client_key: ['client_cert'],
      client_cert_id: {
        not: {
          required: ['client_cert', 'client_key'],
        },
      },
      algorithm: {
        oneOf: [
          {
            properties: {
              algorithm: { enum: ['HS256'] },
            },
            required: ['secret'],
          },
          {
            properties: {
              algorithm: { enum: ['RS256'] },
            },
          },
        ],
      },
    },
  };

  expect(validateSchemaValue(schema, {
    client_cert: 'certificate',
  })).toContainEqual(expect.stringContaining('client_key'));
  expect(validateSchemaValue(schema, {
    client_cert_id: 'cert-id',
    client_cert: 'certificate',
    client_key: 'key',
  })).toContainEqual(expect.stringContaining('disallowed schema'));
  expect(validateSchemaValue(schema, {
    algorithm: 'HS256',
  })).toContainEqual(expect.stringContaining('supported schema'));
  expect(validateSchemaValue(schema, {
    algorithm: 'HS256',
    secret: 'secret',
  })).toEqual([]);
});

test('enforces APISIX if, then, and else branches', () => {
  const schema: JSONSchema = {
    type: 'object',
    required: ['type'],
    properties: {
      type: { type: 'string', enum: ['server', 'client'] },
      sni: { type: 'string' },
      key: { type: 'string' },
      cert: { type: 'string' },
    },
    if: {
      properties: {
        type: { const: 'server' },
      },
    },
    then: {
      required: ['sni', 'key', 'cert'],
      properties: {
        server_name: { type: 'string' },
      },
    },
    else: {
      required: ['key', 'cert'],
      properties: {
        client_name: { type: 'string' },
      },
    },
  };

  expect(validateSchemaValue(schema, {
    type: 'server',
    key: 'key',
    cert: 'cert',
  })).toContainEqual(expect.stringContaining('sni'));
  expect(validateSchemaValue(schema, {
    type: 'client',
  })).toEqual(expect.arrayContaining([
    expect.stringContaining('key'),
    expect.stringContaining('cert'),
  ]));
  expect(getActiveRequiredFields(schema, {
    type: 'server',
  })).toEqual(expect.arrayContaining(['type', 'sni', 'key', 'cert']));
  expect(Object.keys(getSchemaProperties(schema, schema, {
    type: 'server',
  }))).toEqual(expect.arrayContaining(['server_name']));
  expect(Object.keys(getSchemaProperties(schema, schema, {
    type: 'server',
  }))).not.toEqual(expect.arrayContaining(['client_name']));
});

test('enforces APISIX not constraints and IP formats', () => {
  const schema: JSONSchema = {
    type: 'object',
    properties: {
      script: { type: 'string' },
      plugins: { type: 'object' },
      address: {
        anyOf: [
          { type: 'string', format: 'ipv4' },
          { type: 'string', format: 'ipv6' },
        ],
      },
    },
    not: {
      required: ['script', 'plugins'],
    },
  };

  expect(validateSchemaValue(schema, {
    script: 'return true',
    plugins: {},
    address: '999.1.1.1',
  })).toEqual(expect.arrayContaining([
    expect.stringContaining('disallowed schema'),
    expect.stringContaining('address'),
  ]));
  expect(validateSchemaValue(schema, {
    script: 'return true',
    address: '2001:db8::1',
  })).toEqual([]);
});

test('resolves local definitions and exposes composite object properties', () => {
  const schema: JSONSchema = {
    type: 'object',
    definitions: {
      endpoint: {
        type: 'string',
        format: 'uri',
      },
    },
    allOf: [
      {
        properties: {
          endpoint: {
            $ref: '#/definitions/endpoint',
          },
        },
      },
      {
        properties: {
          enabled: {
            type: 'boolean',
          },
        },
      },
    ],
  };

  expect(validateSchemaValue(schema, {
    endpoint: 'not a URI',
    enabled: true,
  })).toContainEqual(expect.stringContaining('endpoint'));
  expect(Object.keys(getSchemaProperties(schema))).toEqual([
    'endpoint',
    'enabled',
  ]);
  expect(getResolvedSchema({
    $ref: '#/definitions/count',
  }, {
    definitions: {
      count: {
        type: 'integer',
        minimum: 1,
      },
    },
  })).toMatchObject({
    type: 'integer',
    minimum: 1,
  });
});
