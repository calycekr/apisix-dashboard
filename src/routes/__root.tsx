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
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRoute, HeadContent, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { theme } from 'antd';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';
import { SettingsModal } from '@/components/page/SettingsModal';
import {
  APPSHELL_HEADER_HEIGHT,
  APPSHELL_NAVBAR_WIDTH,
} from '@/config/constant';
import i18n from '@/config/i18n';
import { useThemeMode } from '@/stores/global';

const Root = () => {
  const [opened, setOpened] = useState(false);
  const toggle = () => setOpened((v) => !v);
  const { token } = theme.useToken();
  const { mode } = useThemeMode();

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  return (
    <I18nextProvider i18n={i18n}>
      <HeadContent />
      <Header opened={opened} toggle={toggle} />
      <Navbar />
      <div
        style={{
          marginTop: APPSHELL_HEADER_HEIGHT,
          marginLeft: APPSHELL_NAVBAR_WIDTH,
          padding: 16,
          minHeight: `calc(100vh - ${APPSHELL_HEADER_HEIGHT}px)`,
          background: token.colorBgLayout,
        }}
      >
        <Outlet />
      </div>
      <TanStackRouterDevtools />
      <ReactQueryDevtools initialIsOpen={false} />
      <SettingsModal />
    </I18nextProvider>
  );
};

export const Route = createRootRoute({
  component: Root,
});
