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

export const getPluginCategory = (name: string): { name: string; color: string; icon: string } => {
  const n = name.toLowerCase();
  if (
    n.includes('auth') ||
    n.includes('jwt') ||
    n.includes('ldap') ||
    n.includes('oidc') ||
    n.includes('wolf-rbac') ||
    n.includes('casin') ||
    n.includes('keycloak') ||
    n.includes('casdoor') ||
    n.includes('opa')
  ) {
    return { name: 'Authentication', color: 'blue', icon: '🔒' };
  }
  if (
    n.includes('security') ||
    n.includes('cors') ||
    n.includes('csrf') ||
    n.includes('restrict') ||
    n.includes('blocker') ||
    n.includes('fault-injection') ||
    n.includes('breaker') ||
    n.includes('client-control') ||
    n.includes('request-validation')
  ) {
    return { name: 'Security', color: 'volcano', icon: '🛡️' };
  }
  if (
    n.includes('limit') ||
    n.includes('traffic') ||
    n.includes('proxy-') ||
    n.includes('redirect') ||
    n.includes('mirror') ||
    n.includes('cache')
  ) {
    return { name: 'Traffic', color: 'cyan', icon: '⚡' };
  }
  if (
    n.includes('log') ||
    n.includes('prometheus') ||
    n.includes('skywalking') ||
    n.includes('zipkin') ||
    n.includes('jaeger') ||
    n.includes('datadog') ||
    n.includes('telemetry') ||
    n.includes('tracing')
  ) {
    return { name: 'Observability', color: 'purple', icon: '📊' };
  }
  if (
    n.includes('serverless') ||
    n.includes('function') ||
    n.includes('lambda') ||
    n.includes('openwhisk')
  ) {
    return { name: 'Serverless', color: 'gold', icon: '☁️' };
  }
  return { name: 'Others', color: 'default', icon: '📦' };
};
