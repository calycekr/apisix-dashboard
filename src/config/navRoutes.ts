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
import type { Resources } from '@/config/i18n';
import type { FileRouteTypes } from '@/routeTree.gen';

export type NavRoute = {
  to: FileRouteTypes['to'];
  label: keyof Resources['en']['common']['sources'];
  icon: string;
};
export const navRoutes: NavRoute[] = [
  {
    to: '/services',
    label: 'services',
    icon: 'dns',
  },
  {
    to: '/routes',
    label: 'routes',
    icon: 'route',
  },
  {
    to: '/stream_routes',
    label: 'streamRoutes',
    icon: 'stream',
  },
  {
    to: '/upstreams',
    label: 'upstreams',
    icon: 'cloud-upload',
  },
  {
    to: '/consumers',
    label: 'consumers',
    icon: 'person',
  },
  {
    to: '/consumer_groups',
    label: 'consumerGroups',
    icon: 'group',
  },
  {
    to: '/ssls',
    label: 'ssls',
    icon: 'lock',
  },
  {
    to: '/global_rules',
    label: 'globalRules',
    icon: 'public',
  },
  {
    to: '/plugin_metadata',
    label: 'pluginMetadata',
    icon: 'data-object',
  },
  {
    to: '/plugin_configs',
    label: 'pluginConfigs',
    icon: 'extension',
  },
  {
    to: '/secrets',
    label: 'secrets',
    icon: 'key',
  },
  {
    to: '/protos',
    label: 'protos',
    icon: 'code',
  },
];
