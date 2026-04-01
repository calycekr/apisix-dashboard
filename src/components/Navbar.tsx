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
import { Layout, Menu } from 'antd';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';

import apisixLogo from '@/assets/apisix-logo.svg';
import { navRoutes } from '@/config/navRoutes';
import { sidebarCollapsedAtom } from '@/stores/global';
import { APPSHELL_HEADER_HEIGHT } from '@/config/constant';
import IconRoute from '~icons/material-symbols/route';
import IconDns from '~icons/material-symbols/dns';
import IconCloudUpload from '~icons/material-symbols/cloud-upload';
import IconPerson from '~icons/material-symbols/person';
import IconGroup from '~icons/material-symbols/group';
import IconLock from '~icons/material-symbols/lock';
import IconStream from '~icons/material-symbols/stream';
import IconPublic from '~icons/material-symbols/public';
import IconExtension from '~icons/material-symbols/extension';
import IconDataObject from '~icons/material-symbols/data-object';
import IconKey from '~icons/material-symbols/key';
import IconCode from '~icons/material-symbols/code';

const iconMap: Record<string, ReactNode> = {
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

export const Navbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [collapsed] = useAtom(sidebarCollapsedAtom);

  const selectedKey =
    navRoutes.find((r) => currentPath.startsWith(r.to))?.to || '';

  return (
    <Layout.Sider
      collapsed={collapsed}
      trigger={null}
      collapsible
      width={250}
      collapsedWidth={64}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 99,
      }}
    >
      <div
        style={{
          height: APPSHELL_HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingInline: collapsed ? 0 : 20,
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
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
              overflow: 'hidden',
            }}
          >
            APISIX
          </span>
        )}
      </div>
      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={[selectedKey]}
        style={{ borderRight: 'none', marginTop: 8 }}
        items={navRoutes.map((route) => ({
          key: route.to,
          icon: iconMap[route.icon],
          label: t(`sources.${route.label}`),
          onClick: () => navigate({ to: route.to }),
        }))}
      />
    </Layout.Sider>
  );
};
