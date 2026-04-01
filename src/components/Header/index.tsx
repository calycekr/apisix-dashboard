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
import { Breadcrumb, Button, Layout, theme } from 'antd';
import type { FC } from 'react';
import { useRouterState } from '@tanstack/react-router';

import { APPSHELL_HEADER_HEIGHT, APPSHELL_NAVBAR_WIDTH } from '@/config/constant';
import { navRoutes } from '@/config/navRoutes';
import { useThemeMode } from '@/stores/global';
import IconLightMode from '~icons/material-symbols/light-mode';
import IconDarkMode from '~icons/material-symbols/dark-mode';

import { SettingModalBtn } from './SettingModalBtn';

const sourceLabels: Record<string, string> = {
  services: 'Services',
  routes: 'Routes',
  streamRoutes: 'Stream Routes',
  upstreams: 'Upstreams',
  consumers: 'Consumers',
  consumerGroups: 'Consumer Groups',
  ssls: 'SSLs',
  globalRules: 'Global Rules',
  pluginMetadata: 'Plugin Metadata',
  pluginConfigs: 'Plugin Configs',
  secrets: 'Secrets',
  protos: 'Protos',
};

export const Header: FC = () => {
  const { token } = theme.useToken();
  const { mode, toggle: toggleTheme } = useThemeMode();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const activeRoute = navRoutes.find((r) => currentPath.startsWith(r.to));

  const breadcrumbItems = [
    { title: 'APISIX Dashboard' },
    ...(activeRoute ? [{ title: sourceLabels[activeRoute.label] ?? activeRoute.label }] : []),
  ];

  return (
    <Layout.Header
      style={{
        height: APPSHELL_HEADER_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        paddingInline: 16,
        justifyContent: 'space-between',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        position: 'fixed',
        top: 0,
        left: APPSHELL_NAVBAR_WIDTH,
        right: 0,
        zIndex: 100,
        lineHeight: `${APPSHELL_HEADER_HEIGHT}px`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button
          variant="text"
          color="default"
          size="small"
          icon={mode === 'dark' ? <IconLightMode /> : <IconDarkMode />}
          onClick={toggleTheme}
          title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        />
        <SettingModalBtn />
      </div>
    </Layout.Header>
  );
};
