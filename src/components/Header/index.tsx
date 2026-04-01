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
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';
import { useRouterState } from '@tanstack/react-router';

import { APPSHELL_HEADER_HEIGHT } from '@/config/constant';
import { navRoutes } from '@/config/navRoutes';
import { sidebarCollapsedAtom, useThemeMode } from '@/stores/global';
import IconMenuOpen from '~icons/material-symbols/menu-open';
import IconMenu from '~icons/material-symbols/menu';
import IconLightMode from '~icons/material-symbols/light-mode';
import IconDarkMode from '~icons/material-symbols/dark-mode';

import { LanguageMenu } from './LanguageMenu';
import { SettingModalBtn } from './SettingModalBtn';

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
};

export const Header: FC<HeaderProps> = () => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { mode, toggle: toggleTheme } = useThemeMode();
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const activeRoute = navRoutes.find((r) => currentPath.startsWith(r.to));

  const breadcrumbItems = [
    { title: t('apisix.dashboard') },
    ...(activeRoute ? [{ title: t(`sources.${activeRoute.label}`) }] : []),
  ];

  const siderWidth = collapsed ? 64 : 250;

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
        left: siderWidth,
        right: 0,
        zIndex: 100,
        transition: 'left 0.2s',
        lineHeight: `${APPSHELL_HEADER_HEIGHT}px`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          variant="text"
          color="default"
          size="small"
          icon={collapsed ? <IconMenu /> : <IconMenuOpen />}
          onClick={() => setCollapsed((v) => !v)}
        />
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button
          variant="text"
          color="default"
          size="small"
          icon={mode === 'dark' ? <IconLightMode /> : <IconDarkMode />}
          onClick={toggleTheme}
          title={mode === 'dark' ? t('switchToLight') : t('switchToDark')}
        />
        <SettingModalBtn />
        <LanguageMenu />
      </div>
    </Layout.Header>
  );
};
