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
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { createFileRoute, useParams } from '@tanstack/react-router';
import { Space } from 'antd';
import { useMemo } from 'react';

import {
  getCredentialListQueryOptions,
  useCredentialsList,
} from '@/apis/hooks';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_CREDENTIALS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';

function CredentialsList() {
  const { username } = useParams({
    from: '/consumers/detail/$username/credentials/',
  });
  const { data, isLoading, refetch } = useCredentialsList(username);

  const columns = useMemo<
    ProColumns<APISIXType['RespCredentialItem']>[]
  >(() => {
    return [
      {
        dataIndex: ['value', 'id'],
        title: 'ID',
        key: 'id',
        valueType: 'text',
      },
      {
        dataIndex: ['value', 'desc'],
        title: 'Description',
        key: 'desc',
        valueType: 'text',
      },
      {
        dataIndex: ['value', 'plugins'],
        title: 'Plugin Type',
        key: 'plugins',
        render: (_, record) => {
          const plugins = record.value.plugins;
          if (!plugins) return '-';
          const keys = Object.keys(plugins);
          return keys.length > 0 ? keys.join(', ') : '-';
        },
      },
      {
        dataIndex: ['value', 'update_time'],
        title: 'Updated At',
        key: 'update_time',
        valueType: 'dateTime',
        sorter: true,
        renderText: (text) => {
          if (!text) return '-';
          return new Date(Number(text) * 1000).toISOString();
        },
      },
      {
        title: 'Actions',
        valueType: 'option',
        key: 'option',
        width: 160,
        render: (_, record) => [
          <Space key="actions">
            <ToDetailPageBtn
              key="detail"
              to="/consumers/detail/$username/credentials/detail/$id"
              params={{
                username: username as string,
                id: record.value.id,
              }}
            />
            <DeleteResourceBtn
              key="delete"
              name={'Credential'}
              target={record.value.id}
              api={`${API_CREDENTIALS(username)}/${record.value.id}`}
              onSuccess={refetch}
            />
          </Space>,
        ],
      },
    ];
  }, [refetch, username]);

  return (
    <AntdConfigProvider>
      <ProTable
        columns={columns}
        dataSource={data.list}
        rowKey="id"
        loading={isLoading}
        search={false}
        options={{ density: false, fullScreen: false, reload: true, setting: true }}
        dateFormatter="string"
        headerTitle="Credentials"
        pagination={false}
        cardProps={{ bodyStyle: { padding: 0 } }}
        toolBarRender={() => [
          <ToAddPageBtn key="add" label="Add Credential" to="/consumers/detail/$username/credentials/add" params={{ username }} />,
        ]}
      />
    </AntdConfigProvider>
  );
}

function RouteComponent() {
  return (
    <>
      <PageHeader title={'Credentials'} />
      <CredentialsList />
    </>
  );
}

export const Route = createFileRoute('/consumers/detail/$username/credentials/')({
  component: RouteComponent,
  loader: ({ params }) =>
    queryClient.ensureQueryData(getCredentialListQueryOptions(params.username)),
});
