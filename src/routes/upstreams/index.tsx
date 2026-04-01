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

import { getUpstreamListQueryOptions, useUpstreamList } from '@/apis/hooks';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_UPSTREAMS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';

function RouteComponent() {
  const { data, isLoading, refetch, pagination, setParams } = useUpstreamList();

  const columns = useMemo<
    ProColumns<APISIXType['RespUpstreamList']['data']['list'][number]>[]
  >(() => {
    return [
      {
        dataIndex: ['value', 'name'],
        title: 'Name',
        key: 'name',
        render: (_, record) => (
          <Typography.Text strong>{record.value.name || '-'}</Typography.Text>
        ),
      },
      {
        dataIndex: ['value', 'type'],
        title: 'Type',
        key: 'type',
        valueType: 'text',
        render: (_, record) => record.value.type || '-',
      },
      {
        dataIndex: ['value', 'nodes'],
        title: 'Nodes',
        key: 'nodes',
        render: (_, record) => {
          const nodes = record.value.nodes;
          if (!nodes) return '-';
          if (Array.isArray(nodes)) return `${nodes.length} node${nodes.length !== 1 ? 's' : ''}`;
          const count = Object.keys(nodes).length;
          return `${count} node${count !== 1 ? 's' : ''}`;
        },
      },
      {
        dataIndex: ['value', 'scheme'],
        title: 'Scheme',
        key: 'scheme',
        valueType: 'text',
        render: (_, record) => record.value.scheme || '-',
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
              to="/upstreams/detail/$id"
              params={{ id: record.value.id }}
            />
            <DeleteResourceBtn
              key="delete"
              name={'Upstream'}
              target={record.value.id}
              api={`${API_UPSTREAMS}/${record.value.id}`}
              onSuccess={refetch}
            />
          </Space>,
        ],
      },
    ];
  }, [refetch]);

  return (
    <>
      <PageHeader title={'Upstreams'} />
      <AntdConfigProvider>
        <ProTable
          columns={columns}
          dataSource={data?.list}
          rowKey="id"
          loading={isLoading}
          search={false}
          options={{ density: false, fullScreen: false, reload: true, setting: true }}
          dateFormatter="string"
          headerTitle="Upstreams"
          pagination={pagination}
          cardProps={{ bodyStyle: { padding: 0 } }}
          toolBarRender={() => [
            <SearchInput key="search" onSearch={(name) => setParams({ name, page: 1 })} />,
            <ToAddPageBtn key="add" label="Add Upstream" to="/upstreams/add" />,
          ]}
        />
      </AntdConfigProvider>
    </>
  );
}

export const Route = createFileRoute('/upstreams/')({
  component: RouteComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getUpstreamListQueryOptions(deps)),
});
