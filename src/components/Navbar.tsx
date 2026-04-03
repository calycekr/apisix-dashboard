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
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Button, Layout, Menu, theme } from 'antd';
import { useAtom } from 'jotai';
import { type ReactNode, useEffect } from 'react';

import apisixLogo from '@/assets/apisix-logo.svg';
import { APPSHELL_HEADER_HEIGHT } from '@/config/constant';
import { navRoutes } from '@/config/navRoutes';
import { sidebarCollapsedAtom } from '@/stores/global';
import IconCloudUpload from '~icons/material-symbols/cloud-upload';
import IconCode from '~icons/material-symbols/code';
import IconDashboard from '~icons/material-symbols/dashboard';
import IconDataObject from '~icons/material-symbols/data-object';
import IconDeviceHub from '~icons/material-symbols/device-hub';
import IconDns from '~icons/material-symbols/dns';
import IconExportNotes from '~icons/material-symbols/export-notes';
import IconExtension from '~icons/material-symbols/extension';
import IconGroup from '~icons/material-symbols/group';
import IconKey from '~icons/material-symbols/key';
import IconLock from '~icons/material-symbols/lock';
import IconMenu from '~icons/material-symbols/menu';
import IconMenuOpen from '~icons/material-symbols/menu-open';
import IconPerson from '~icons/material-symbols/person';
import IconPublic from '~icons/material-symbols/public';
import IconRoute from '~icons/material-symbols/route';
import IconStream from '~icons/material-symbols/stream';
import IconTerminal from '~icons/material-symbols/terminal';

const iconMap: Record<string, ReactNode> = {
  dashboard: <IconDashboard />,
  route: <IconRoute />,
  dns: <IconDns />,
  'cloud-upload': <IconCloudUpload />,
  person: <IconPerson />,
  group: <IconGroup />,
  lock: <IconLock />,
  stream: <IconStream />,
  public: <IconPublic />,
  extension: <IconExtension />,
  'data-object': <IconDataObject />,
  key: <IconKey />,
  code: <IconCode />,
};

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

export const SIDEBAR_COLLAPSED_WIDTH = 64;

export const Navbar = () => {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 992px)');
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    if (mq.matches) setCollapsed(true);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setCollapsed]);

  const selectedKey =
    ['/dashboard', '/topology', '/export_import', '/raw_api']
      .find((p) => currentPath.startsWith(p))
    ?? navRoutes.find((r) => currentPath.startsWith(r.to))?.to
    ?? '';

  return (
    <Layout.Sider
      trigger={null}
      width={250}
      collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
      collapsed={collapsed}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 99,
        background: token.colorBgContainer,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo — fixed at top, never scrolls */}
      <div
        style={{
          height: APPSHELL_HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          paddingInline: collapsed ? 0 : 20,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={apisixLogo}
            alt="APISIX"
            width={28}
            height={28}
            style={{ objectFit: 'contain', flexShrink: 0 }}
          />
          {!collapsed && (
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: 0.3,
                whiteSpace: 'nowrap',
              }}
            >
              APISIX
            </span>
          )}
        </div>
        {!collapsed && (
          <Button
            type="text"
            size="small"
            icon={<IconMenuOpen />}
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            style={{ flexShrink: 0 }}
          />
        )}
        {collapsed && (
          <Button
            type="text"
            size="small"
            icon={<IconMenu />}
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            style={{ flexShrink: 0 }}
          />
        )}
      </div>
      {/* Menu — scrollable */}
      <div style={{ flex: 1, overflow: 'auto' }}>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ borderRight: 'none', marginTop: 8 }}
        items={[
          {
            type: 'group',
            label: 'Overview',
            children: [
              {
                key: '/dashboard',
                icon: iconMap['dashboard'],
                label: 'Dashboard',
                onClick: () => navigate({ to: '/dashboard' as Parameters<typeof navigate>[0]['to'] }),
              },
              {
                key: '/topology',
                icon: <IconDeviceHub />,
                label: 'Topology',
                onClick: () => navigate({ to: '/topology' as Parameters<typeof navigate>[0]['to'] }),
              },
            ],
          },
          {
            type: 'group',
            label: 'Traffic',
            children: ['/routes', '/stream_routes', '/services', '/upstreams'].map((to) => {
              const route = navRoutes.find((r) => r.to === to)!;
              return {
                key: route.to,
                icon: iconMap[route.icon],
                label: sourceLabels[route.label] ?? route.label,
                onClick: () => navigate({ to: route.to as Parameters<typeof navigate>[0]['to'] }),
              };
            }),
          },
          {
            type: 'group',
            label: 'Authentication',
            children: ['/consumers', '/consumer_groups'].map((to) => {
              const route = navRoutes.find((r) => r.to === to)!;
              return {
                key: route.to,
                icon: iconMap[route.icon],
                label: sourceLabels[route.label] ?? route.label,
                onClick: () => navigate({ to: route.to as Parameters<typeof navigate>[0]['to'] }),
              };
            }),
          },
          {
            type: 'group',
            label: 'Security',
            children: ['/ssls', '/secrets'].map((to) => {
              const route = navRoutes.find((r) => r.to === to)!;
              return {
                key: route.to,
                icon: iconMap[route.icon],
                label: sourceLabels[route.label] ?? route.label,
                onClick: () => navigate({ to: route.to as Parameters<typeof navigate>[0]['to'] }),
              };
            }),
          },
          {
            type: 'group',
            label: 'Configuration',
            children: ['/global_rules', '/plugin_configs', '/plugin_metadata', '/protos'].map((to) => {
              const route = navRoutes.find((r) => r.to === to)!;
              return {
                key: route.to,
                icon: iconMap[route.icon],
                label: sourceLabels[route.label] ?? route.label,
                onClick: () => navigate({ to: route.to as Parameters<typeof navigate>[0]['to'] }),
              };
            }),
          },
          {
            type: 'group',
            label: 'Tools',
            children: [
              {
                key: '/export_import',
                icon: <IconExportNotes />,
                label: 'Import / Export',
                onClick: () => navigate({ to: '/export_import' as Parameters<typeof navigate>[0]['to'] }),
              },
              {
                key: '/raw_api',
                icon: <IconTerminal />,
                label: 'Raw API',
                onClick: () => navigate({ to: '/raw_api' as Parameters<typeof navigate>[0]['to'] }),
              },
            ],
          },
        ]}
      />
      </div>
    </Layout.Sider>
  );
};
