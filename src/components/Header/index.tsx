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
import axios from 'axios';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';

import { ActivityLogButton } from '@/components/ActivityLogDrawer';
import { GlobalSearch } from '@/components/GlobalSearch';
import { SIDEBAR_COLLAPSED_WIDTH } from '@/components/Navbar';
import {
  APPSHELL_HEADER_HEIGHT,
  APPSHELL_NAVBAR_WIDTH,
  SKIP_INTERCEPTOR_HEADER,
} from '@/config/constant';
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
  const { data: apiStatus } = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      try {
        await req.get('/routes', {
          params: { page: 1, page_size: 1 },
          headers: {
            [SKIP_INTERCEPTOR_HEADER]: [
              'network',
              '400',
              '401',
              '403',
              '404',
              '500',
              '502',
              '503',
              '504',
            ],
          },
        });
        return {
          state: 'connected' as const,
          label: 'Connected',
          tooltip: 'APISIX Admin API and its configuration store are available.',
        };
      } catch (error) {
        if (!axios.isAxiosError(error) || !error.response) {
          return {
            state: 'disconnected' as const,
            label: 'Disconnected',
            tooltip: 'Cannot reach the APISIX Admin API.',
          };
        }
        if (error.response.status === 401 || error.response.status === 403) {
          return {
            state: 'auth' as const,
            label: 'Auth failed',
            tooltip: 'APISIX Admin API rejected the configured Admin Key.',
          };
        }
        if (error.response.status === 503) {
          return {
            state: 'degraded' as const,
            label: 'etcd unavailable',
            tooltip:
              'APISIX Admin API is reachable but cannot read its configuration store. Check APISIX-to-etcd connectivity and etcd health.',
          };
        }
        return {
          state: 'degraded' as const,
          label: 'Admin API degraded',
          tooltip: `APISIX Admin API responded with HTTP ${error.response.status}.`,
        };
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });

  const badgeStatus =
    apiStatus?.state === 'connected'
      ? 'success'
      : apiStatus?.state === 'degraded'
        ? 'warning'
        : apiStatus
          ? 'error'
          : 'processing';

  return (
    <Tooltip title={apiStatus?.tooltip ?? 'Checking APISIX Admin API status'}>
      <Badge
        status={badgeStatus}
        text={
          <span style={{ fontSize: 12 }}>
            {apiStatus?.label ?? 'Checking'}
          </span>
        }
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
