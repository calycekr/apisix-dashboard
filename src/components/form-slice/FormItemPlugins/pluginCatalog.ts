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

export type PluginCatalogEntry = {
  description: string;
  category: string;
  keywords: string[];
  capabilities: string[];
};

const entries: Record<string, PluginCatalogEntry> = {
  'ai-proxy': {
    description:
      'Proxy requests to OpenAI, Bedrock, Vertex AI, Anthropic, and other LLM providers.',
    category: 'AI Gateway',
    keywords: ['llm', 'model', 'bedrock', 'openai', 'anthropic', 'gemini'],
    capabilities: ['LLM proxy', 'Streaming', 'Provider conversion'],
  },
  'ai-proxy-multi': {
    description:
      'Balance AI requests across multiple providers with health checks and bounded fallback.',
    category: 'AI Gateway',
    keywords: ['llm', 'fallback', 'load balancing', 'retry', 'multi provider'],
    capabilities: ['Multi-provider', 'Fallback', 'Health checks'],
  },
  'ai-prompt-guard': {
    description:
      'Validate AI prompts against allow and deny patterns, with configurable handling for unsupported request formats.',
    category: 'AI Gateway',
    keywords: ['llm', 'prompt', 'guardrail', 'consumer', 'fail mode'],
    capabilities: ['Prompt guardrails', 'Consumer policies', 'Fail mode'],
  },
  'ai-aliyun-content-moderation': {
    description:
      'Moderate AI requests and responses with Alibaba Cloud services and explicit unsupported-request handling.',
    category: 'AI Gateway',
    keywords: ['llm', 'moderation', 'aliyun', 'consumer', 'fail mode'],
    capabilities: ['Content moderation', 'Request checks', 'Fail mode'],
  },
  'ai-aws-content-moderation': {
    description:
      'Moderate AI request content with AWS Comprehend and configurable handling for non-AI traffic.',
    category: 'AI Gateway',
    keywords: ['llm', 'moderation', 'aws', 'comprehend', 'fail mode'],
    capabilities: ['Content moderation', 'AWS Comprehend', 'Fail mode'],
  },
  'openid-connect': {
    description:
      'Authenticate requests with OpenID Connect, including local JWT verification, PKCE, and lua-resty-session 4.x settings.',
    category: 'Authentication',
    keywords: ['oidc', 'oauth', 'jwt', 'pkce', 'session', 'sso'],
    capabilities: ['OIDC', 'Local JWT verification', 'Session management'],
  },
  'forward-auth': {
    description:
      'Delegate authorization to an external service with bounded POST request-body forwarding.',
    category: 'Authentication',
    keywords: ['external auth', 'authorization', 'request body limit'],
    capabilities: ['External authorization', 'Body size limit'],
  },
  'hmac-auth': {
    description:
      'Authenticate signed requests with HMAC credentials and bounded request-body digest validation.',
    category: 'Authentication',
    keywords: ['signature', 'digest', 'request body limit', 'consumer'],
    capabilities: ['HMAC signatures', 'Body validation', 'Body size limit'],
  },
  'batch-requests': {
    description:
      'Execute bounded internal request pipelines with metadata controls for body size and pipeline item count.',
    category: 'Traffic',
    keywords: ['batch', 'pipeline', 'metadata', 'request limit'],
    capabilities: ['Request pipeline', 'Pipeline limits'],
  },
  'proxy-buffering': {
    description:
      'Control buffering of upstream responses before they are sent to clients.',
    category: 'Traffic',
    keywords: ['buffer', 'upstream response', 'streaming'],
    capabilities: ['Response buffering'],
  },
  'graphql-proxy-cache': {
    description:
      'Cache GraphQL query responses to reduce upstream load and response latency.',
    category: 'Traffic',
    keywords: ['graphql', 'cache', 'query'],
    capabilities: ['GraphQL', 'Response cache'],
  },
  'graphql-limit-count': {
    description:
      'Limit GraphQL operation complexity or field counts to protect upstream services.',
    category: 'Security',
    keywords: ['graphql', 'limit', 'complexity', 'dos'],
    capabilities: ['GraphQL', 'Request limits'],
  },
  'saml-auth': {
    description:
      'Authenticate users through a SAML 2.0 identity provider and single sign-on flow.',
    category: 'Authentication',
    keywords: ['saml', 'sso', 'identity provider', 'login'],
    capabilities: ['SAML 2.0', 'SSO'],
  },
  'feishu-auth': {
    description:
      'Authenticate users with Feishu OAuth and optionally pass user information upstream.',
    category: 'Authentication',
    keywords: ['feishu', 'oauth', 'login', 'enterprise'],
    capabilities: ['Enterprise login', 'OAuth'],
  },
  'dingtalk-auth': {
    description:
      'Authenticate users with DingTalk OAuth and optionally pass user information upstream.',
    category: 'Authentication',
    keywords: ['dingtalk', 'oauth', 'login', 'enterprise'],
    capabilities: ['Enterprise login', 'OAuth'],
  },
  acl: {
    description:
      'Allow or deny requests by matching values such as Consumer labels against access rules.',
    category: 'Security',
    keywords: ['access control', 'allowlist', 'denylist', 'consumer label'],
    capabilities: ['Access control', 'Consumer labels'],
  },
  'data-mask': {
    description:
      'Mask sensitive values in query parameters, headers, and JSON request bodies.',
    category: 'Security',
    keywords: ['pii', 'redact', 'sensitive data', 'privacy', 'mask'],
    capabilities: ['Data masking', 'PII protection'],
  },
  'exit-transformer': {
    description:
      'Transform APISIX error status codes, headers, and response bodies before returning them.',
    category: 'Transformation',
    keywords: ['error response', 'status code', 'body transform', 'header'],
    capabilities: ['Error transform', 'Response transform'],
  },
  'traffic-label': {
    description:
      'Attach labels or headers to requests when configured traffic conditions match.',
    category: 'Traffic',
    keywords: ['label', 'condition', 'routing', 'request header'],
    capabilities: ['Traffic classification', 'Conditional labels'],
  },
  'oas-validator': {
    description:
      'Validate requests and responses against an OpenAPI specification.',
    category: 'Security',
    keywords: ['openapi', 'oas', 'schema', 'request validation', 'response validation'],
    capabilities: ['OpenAPI validation', 'Schema enforcement'],
  },
  'error-page': {
    description:
      'Return customized error pages or JSON responses for selected HTTP status codes.',
    category: 'Transformation',
    keywords: ['error page', 'custom response', 'status code', 'html', 'json'],
    capabilities: ['Custom errors', 'Error pages'],
  },
};

export const getPluginCatalogEntry = (
  name: string
): PluginCatalogEntry | undefined => entries[name];

export const getPluginDescription = (
  name: string,
  schemaDescription?: string
): string | undefined =>
  schemaDescription?.trim() || getPluginCatalogEntry(name)?.description;

export const getPluginSearchText = (
  name: string,
  schemaDescription?: string
): string => {
  const entry = getPluginCatalogEntry(name);
  return [
    name,
    getPluginDescription(name, schemaDescription),
    entry?.category,
    ...(entry?.keywords ?? []),
    ...(entry?.capabilities ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};
