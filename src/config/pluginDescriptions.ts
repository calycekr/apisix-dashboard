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

/**
 * Brief descriptions of common APISIX plugins for the plugin selection UI.
 */
export const PLUGIN_DESCRIPTIONS: Record<string, string> = {
  // Authentication
  'key-auth': 'Authenticate requests using API keys via header or query param.',
  'basic-auth': 'HTTP Basic Authentication with username and password.',
  'jwt-auth': 'Authenticate using JSON Web Tokens (JWT).',
  'hmac-auth': 'HMAC-based authentication for request signing.',
  'authz-keycloak': 'Authorization via Keycloak Identity Server.',
  'authz-casbin': 'Role-based access control using Casbin.',
  'authz-casdoor': 'Authentication and authorization using Casdoor.',
  'wolf-rbac': 'Role-based access control using Wolf.',
  'openid-connect': 'OpenID Connect authentication and SSO.',
  'cas-auth': 'CAS (Central Authentication Service) integration.',
  'forward-auth': 'Forward authentication to an external service.',
  'opa': 'Authorization via Open Policy Agent.',
  'multi-auth': 'Chain multiple authentication plugins together.',

  // Security
  'cors': 'Enable Cross-Origin Resource Sharing (CORS) headers.',
  'uri-blocker': 'Block requests matching specific URI patterns.',
  'ip-restriction': 'Allow or deny requests based on client IP address.',
  'ua-restriction': 'Allow or deny based on User-Agent header.',
  'referer-restriction': 'Restrict access based on Referer header.',
  'consumer-restriction': 'Restrict route access to specific consumers.',
  'csrf': 'Protect against Cross-Site Request Forgery attacks.',
  'public-api': 'Expose internal APISIX APIs as public endpoints.',

  // Traffic Control
  'limit-req': 'Rate limit requests using the leaky bucket algorithm.',
  'limit-conn': 'Limit the number of concurrent connections.',
  'limit-count': 'Rate limit using a fixed time window counter.',
  'proxy-mirror': 'Mirror traffic to another upstream for testing.',
  'api-breaker': 'Circuit breaker to protect upstream from overload.',
  'traffic-split': 'Split traffic between upstreams (canary/blue-green).',
  'request-id': 'Add unique request ID header for tracing.',
  'proxy-control': 'Control proxy behavior dynamically.',
  'client-control': 'Control client request behavior (e.g., max body size).',

  // Transformations
  'response-rewrite': 'Rewrite upstream response status, headers, or body.',
  'proxy-rewrite': 'Rewrite upstream request URI, host, or headers.',
  'grpc-transcode': 'Transcode HTTP requests to gRPC and vice versa.',
  'grpc-web': 'Support gRPC-Web protocol for browser clients.',
  'fault-injection': 'Inject faults (delays, aborts) for testing.',
  'mocking': 'Return mock responses without forwarding to upstream.',
  'degraphql': 'Convert GraphQL queries to RESTful requests.',
  'body-transformer': 'Transform request/response body format.',

  // Observability
  'prometheus': 'Export metrics to Prometheus for monitoring.',
  'zipkin': 'Distributed tracing with Zipkin.',
  'skywalking': 'Distributed tracing with Apache SkyWalking.',
  'opentelemetry': 'Distributed tracing with OpenTelemetry.',
  'datadog': 'Send metrics and traces to Datadog.',
  'node-status': 'Expose APISIX node status information.',
  'inspect': 'Inspect and debug Lua code at runtime.',

  // Logging
  'http-logger': 'Send access logs to an HTTP endpoint.',
  'tcp-logger': 'Send access logs via TCP.',
  'udp-logger': 'Send access logs via UDP.',
  'kafka-logger': 'Send access logs to Apache Kafka.',
  'rocketmq-logger': 'Send access logs to Apache RocketMQ.',
  'syslog': 'Send access logs to syslog.',
  'clickhouse-logger': 'Send access logs to ClickHouse.',
  'elasticsearch-logger': 'Send access logs to Elasticsearch.',
  'file-logger': 'Write access logs to a local file.',
  'loggly': 'Send access logs to Loggly.',
  'splunk-hec-logging': 'Send access logs to Splunk HEC.',
  'google-cloud-logging': 'Send access logs to Google Cloud Logging.',
  'tencent-cloud-cls': 'Send access logs to Tencent Cloud CLS.',
  'loki-logger': 'Send access logs to Grafana Loki.',

  // Serverless
  'serverless-pre-function': 'Execute custom Lua code before plugin execution.',
  'serverless-post-function': 'Execute custom Lua code after plugin execution.',
  'ext-plugin-pre-req': 'Call external plugin runner before request.',
  'ext-plugin-post-req': 'Call external plugin runner before response.',
  'ext-plugin-post-resp': 'Call external plugin runner after response.',

  // Other
  'redirect': 'Redirect requests to a different URI.',
  'echo': 'Echo request back as response for debugging.',
  'gzip': 'Compress response body with gzip.',
  'real-ip': 'Extract real client IP from headers like X-Forwarded-For.',
  'server-info': 'Report server information periodically.',
  'workflow': 'Conditional plugin execution based on rules.',
};
