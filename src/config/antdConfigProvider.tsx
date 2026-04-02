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
import '@ant-design/v5-patch-for-react-19';

import { ConfigProvider, Empty, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import type { PropsWithChildren } from 'react';

import { useThemeMode } from '@/stores/global';

export const AntdConfigProvider = (props: PropsWithChildren) => {
  const { children } = props;
  const { mode } = useThemeMode();

  const isDark = mode === 'dark';

  return (
    <ConfigProvider
      virtual
      locale={enUS}
      renderEmpty={() => (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No items yet. Use the Add button above to create one."
        />
      )}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadiusSM: 2,
          borderRadius: 4,
          borderRadiusLG: 6,
        },
        components: {
          Table: {
            headerBg: isDark ? '#1f1f1f' : '#fafafa',
            borderColor: isDark ? '#303030' : '#f0f0f0',
            rowHoverBg: isDark ? '#262626' : '#f5f5f5',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};
