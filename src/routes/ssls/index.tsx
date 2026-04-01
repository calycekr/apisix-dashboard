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
import { createFileRoute } from '@tanstack/react-router';
import { Space, Typography } from 'antd';
import { useMemo } from 'react';

import { getSSLListQueryOptions, useSSLList } from '@/apis/hooks';
import { StatusTag } from '@/components/StatusTag';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_SSLS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';

function RouteComponent() {
  const { data, isLoading, refetch, pagination } = useSSLList();

  const columns = useMemo<ProColumns<APISIXType['RespSSLItem']>[]>(() => {
    return [
      {
        dataIndex: ['value', 'sni'],
        title: 'SNI',
        key: 'sni',
        render: (_, record) => {
          const sni = record.value.sni;
          const snis = record.value.snis;
          const display = sni || (snis && snis.length > 0 ? snis.join(', ') : '-');
          return <Typography.Text strong>{display}</Typography.Text>;
        },
      },
      {
        dataIndex: ['value', 'type'],
        title: 'Type',
        key: 'type',
        valueType: 'text',
        render: (_, record) => record.value.type || '-',
      },
      {
        dataIndex: ['value', 'status'],
        title: 'Status',
        key: 'status',
        render: (_, record) => <StatusTag status={record.value.status} />,
      },
      {
        dataIndex: ['value', 'validity_end'],
        title: 'Expiry',
        key: 'validity_end',
        valueType: 'dateTime',
        renderText: (text) => {
          if (!text) return '-';
          return new Date(Number(text) * 1000).toISOString();
        },
      },
      {
        dataIndex: ['value', 'update_time'],
        title: 'Updated At',
        key: 'update_time',
        valueType: 'dateTime',
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
              to="/ssls/detail/$id"
              params={{ id: record.value.id }}
            />
            <DeleteResourceBtn
              key="delete"
              name={'SSL'}
              target={record.value.id}
              api={`${API_SSLS}/${record.value.id}`}
              onSuccess={refetch}
            />
          </Space>,
        ],
      },
    ];
  }, [refetch]);

  return (
    <>
      <PageHeader title={'SSLs'} />
      <AntdConfigProvider>
        <ProTable
          columns={columns}
          dataSource={data?.list}
          rowKey="id"
          loading={isLoading}
          search={false}
          options={{ density: false, fullScreen: false, reload: true, setting: true }}
          dateFormatter="string"
          headerTitle="SSLs"
          pagination={pagination}
          cardProps={{ bodyStyle: { padding: 0 } }}
          toolbar={{
            menu: {
              type: 'inline',
              items: [
                {
                  key: 'add',
                  label: (
                    <ToAddPageBtn
                      key="add"
                      to="/ssls/add"
                      label={`Add ${'SSL'}`}
                    />
                  ),
                },
              ],
            },
          }}
        />
      </AntdConfigProvider>
    </>
  );
}

export const Route = createFileRoute('/ssls/')({
  component: RouteComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getSSLListQueryOptions(deps)),
});
