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
import dayjs from 'dayjs';
import { useMemo } from 'react';

import { getConsumerGroupListQueryOptions, useConsumerGroupList } from '@/apis/hooks';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_CONSUMER_GROUPS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';

function ConsumerGroupsList() {
  const { data, isLoading, refetch, pagination, setParams } = useConsumerGroupList();

  const columns = useMemo<
    ProColumns<APISIXType['RespConsumerGroupItem']>[]
  >(() => {
    return [
      {
        dataIndex: ['value', 'id'],
        title: 'ID',
        key: 'id',
        render: (_, record) => (
          <Typography.Text strong>{record.value.id}</Typography.Text>
        ),
      },
      {
        dataIndex: ['value', 'desc'],
        title: 'Description',
        key: 'desc',
        valueType: 'text',
      },
      {
        dataIndex: ['value', 'plugins'],
        title: 'Plugins',
        key: 'plugins',
        render: (_, record) => {
          const plugins = record.value.plugins;
          if (!plugins) return '-';
          const count = Object.keys(plugins).length;
          return `${count} plugin${count !== 1 ? 's' : ''}`;
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
          return dayjs.unix(Number(text)).format('YYYY-MM-DD HH:mm:ss');
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
              to="/consumer_groups/detail/$id"
              params={{ id: record.value.id }}
            />
            <DeleteResourceBtn
              key="delete"
              name={'Consumer Group'}
              target={record.value.id}
              api={`${API_CONSUMER_GROUPS}/${record.value.id}`}
              onSuccess={refetch}
            />
          </Space>,
        ],
      },
    ];
  }, [refetch]);

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
        headerTitle="Consumer Groups"
        pagination={pagination}
        cardProps={{ bodyStyle: { padding: 0 } }}
        toolBarRender={() => [
          <SearchInput key="search" placeholder="Search consumer groups..." onSearch={(name) => setParams({ name, page: 1 })} />,
          <ToAddPageBtn key="add" label="Add Consumer Group" to="/consumer_groups/add" />,
        ]}
      />
    </AntdConfigProvider>
  );
}

function RouteComponent() {
  return (
    <>
      <PageHeader title={'Consumer Groups'} />
      <ConsumerGroupsList />
    </>
  );
}

export const Route = createFileRoute('/consumer_groups/')({
  component: RouteComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getConsumerGroupListQueryOptions(deps)),
});
