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
import { Menu } from 'antd';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { navRoutes } from '@/config/navRoutes';
import { APPSHELL_HEADER_HEIGHT, APPSHELL_NAVBAR_WIDTH } from '@/config/constant';

export const Navbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const selectedKey = navRoutes.find((r) =>
    currentPath.startsWith(r.to)
  )?.to || '';

  return (
    <div
      style={{
        width: APPSHELL_NAVBAR_WIDTH,
        position: 'fixed',
        top: APPSHELL_HEADER_HEIGHT,
        left: 0,
        bottom: 0,
        overflowY: 'auto',
        borderRight: '1px solid #f0f0f0',
        background: '#fff',
        zIndex: 99,
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ borderRight: 'none', height: '100%' }}
        items={navRoutes.map((route) => ({
          key: route.to,
          label: t(`sources.${route.label}`),
          onClick: () => navigate({ to: route.to }),
        }))}
      />
    </div>
  );
};
