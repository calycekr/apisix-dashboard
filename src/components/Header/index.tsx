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
import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { Badge, Breadcrumb, Button, Layout, theme, Tooltip } from 'antd';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';

import { ActivityLogButton } from '@/components/ActivityLogDrawer';
import { GlobalSearch } from '@/components/GlobalSearch';
import { SIDEBAR_COLLAPSED_WIDTH } from '@/components/Navbar';
import { APPSHELL_HEADER_HEIGHT, APPSHELL_NAVBAR_WIDTH } from '@/config/constant';
import { navRoutes } from '@/config/navRoutes';
import { req } from '@/config/req';
import { sidebarCollapsedAtom, useThemeMode } from '@/stores/global';
import IconDarkMode from '~icons/material-symbols/dark-mode';
import IconLightMode from '~icons/material-symbols/light-mode';

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

const ApiStatusIndicator = () => {
  const { data: isConnected } = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      try {
        await req.get('/routes', { params: { page: 1, page_size: 10 } });
        return true;
      } catch {
        return false;
      }
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return (
    <Tooltip title={isConnected === false ? 'APISIX Admin API unreachable' : 'APISIX Admin API connected'}>
      <Badge
        status={isConnected === false ? 'error' : isConnected === true ? 'success' : 'processing'}
        text={<span style={{ fontSize: 12 }}>{isConnected === false ? 'Disconnected' : 'Connected'}</span>}
      />
    </Tooltip>
  );
};

export const Header: FC = () => {
  const { token } = theme.useToken();
  const { mode, toggle: toggleTheme } = useThemeMode();
  const collapsed = useAtomValue(sidebarCollapsedAtom);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : APPSHELL_NAVBAR_WIDTH;
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
        left: sidebarWidth,
        transition: 'left 0.2s',
        right: 0,
        zIndex: 100,
        lineHeight: `${APPSHELL_HEADER_HEIGHT}px`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Breadcrumb items={breadcrumbItems} />
        <GlobalSearch />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ApiStatusIndicator />
        <ActivityLogButton />
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
