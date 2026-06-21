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

export type PluginCompatibilityNotice = {
  key: string;
  type: 'info' | 'warning';
  message: string;
  description: string;
};

const AI_BINDING_PLUGINS = new Set([
  'ai-aliyun-content-moderation',
  'ai-aws-content-moderation',
  'ai-prompt-guard',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const hasValue = (value: unknown): boolean =>
  typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;

const validateOpenIdConnect = (config: Record<string, unknown>): string[] => {
  if (hasValue(config.client_secret)) return [];

  const bearerOnly = config.bearer_only === true;
  const clientSecretOptional = bearerOnly
    ? hasValue(config.public_key) ||
      config.use_jwks === true ||
      config.introspection_endpoint_auth_method === 'private_key_jwt'
    : config.token_endpoint_auth_method === 'private_key_jwt' ||
      config.use_pkce === true;

  return clientSecretOptional
    ? []
    : [
        'client_secret is required unless the selected OpenID Connect flow uses local JWT verification, private_key_jwt, or non-bearer PKCE.',
      ];
};

const validateLimitCount = (config: Record<string, unknown>): string[] => {
  const redisPolicies = new Set(['redis', 'redis-cluster', 'redis-sentinel']);
  if (!redisPolicies.has(String(config.policy ?? 'local'))) return [];

  const syncInterval = config.sync_interval;
  if (typeof syncInterval !== 'number' || syncInterval === -1) return [];
  if (syncInterval < 0.1) {
    return ['sync_interval must be -1 or at least 0.1 seconds.'];
  }

  const timeWindow = config.time_window;
  return typeof timeWindow === 'number' && syncInterval >= timeWindow
    ? ['sync_interval must be smaller than time_window.']
    : [];
};

export const validatePluginCompatibility = (
  name: string,
  config: Record<string, unknown>
): string[] => {
  if (name === 'openid-connect') return validateOpenIdConnect(config);
  if (name === 'limit-count') return validateLimitCount(config);
  return [];
};

export const getPluginCompatibilityNotices = (
  name: string,
  config: Record<string, unknown>
): PluginCompatibilityNotice[] => {
  const notices: PluginCompatibilityNotice[] = [];

  if (AI_BINDING_PLUGINS.has(name) && (config.fail_mode ?? 'skip') === 'skip') {
    notices.push({
      key: 'ai-fail-mode-skip',
      type: 'warning',
      message: 'Unsupported requests pass through unchecked',
      description:
        'fail_mode defaults to skip. For Consumer-bound policies that must reject non-AI or unsupported request formats, select error. Select warn to allow the request but record the skip.',
    });
  }

  if (name === 'openid-connect') {
    const session = isRecord(config.session) ? config.session : undefined;
    const cookie = session && isRecord(session.cookie) ? session.cookie : undefined;
    if (cookie && hasValue(cookie.lifetime)) {
      notices.push({
        key: 'oidc-cookie-lifetime',
        type: 'warning',
        message: 'session.cookie.lifetime is deprecated',
        description:
          'Move this value to session.absolute_timeout. APISIX currently maps the legacy field only when absolute_timeout is not configured.',
      });
    }
  }

  return notices;
};
