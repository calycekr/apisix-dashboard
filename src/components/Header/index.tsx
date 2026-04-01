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
import { Button } from 'antd';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import apisixLogo from '@/assets/apisix-logo.svg';
import { APPSHELL_HEADER_HEIGHT } from '@/config/constant';
import IconMenu from '~icons/material-symbols/menu';

import { LanguageMenu } from './LanguageMenu';
import { SettingModalBtn } from './SettingModalBtn';

const Logo = () => {
  const { t } = useTranslation();
  return (
    <img src={apisixLogo} alt={t('apisix.logo')} width={24} height={24} style={{ objectFit: 'fill' }} />
  );
};

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
};
export const Header: FC<HeaderProps> = (props) => {
  const { toggle } = props;
  const { t } = useTranslation();
  return (
    <div
      style={{
        height: APPSHELL_HEADER_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        paddingInline: 16,
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button
          variant="filled"
          color="default"
          size="small"
          icon={<IconMenu />}
          onClick={toggle}
          style={{ display: 'none' }}
        />
        <Logo />
        <div>{t('apisix.dashboard')}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SettingModalBtn />
        <LanguageMenu />
      </div>
    </div>
  );
};
