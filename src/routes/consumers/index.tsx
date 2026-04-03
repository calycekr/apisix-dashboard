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
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { getConsumerListQueryOptions, useConsumerList } from '@/apis/hooks';
import { CopyableID } from '@/components/CopyableID';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import { ConsumerExpandedRow } from '@/components/page/ExpandedRowComponents';
import PageHeader from '@/components/page/PageHeader';
import { RawDrawer } from '@/components/page/RawDrawer';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_CONSUMERS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import { useBulkActions } from '@/utils/useBulkActions';

function ConsumersList() {
  const { data, isLoading, refetch, pagination, setParams } = useConsumerList();
  const { rowSelection, bulkBarProps } = useBulkActions(refetch);
  const [rawTarget, setRawTarget] = useState<{ api: string; title: string } | null>(null);

  const columns = useMemo<ProColumns<APISIXType['RespConsumerItem']>[]>(() => {
    return [
      {
        dataIndex: ['value', 'username'],
        title: 'Username',
        key: 'username',
        render: (_, record) => <CopyableID id={record.value.username} />,
      },
      {
        dataIndex: ['value', 'desc'],
        title: 'Description',
        key: 'desc',
        valueType: 'text',
      },
      {
        dataIndex: ['value', 'group_id'],
        title: 'Group',
        key: 'group_id',
        render: (_, record) => {
          const id = record.value.group_id;
          if (!id) return '-';
          return (
            <Typography.Link>
              <Link to="/consumer_groups/detail/$id" params={{ id }}>{id}</Link>
            </Typography.Link>
          );
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
        width: 200,
        render: (_, record) => [
          <Space key="actions">
            <Button
              key="raw"
              size="small"
              type="text"
              onClick={() => setRawTarget({ api: `${API_CONSUMERS}/${record.value.username}`, title: `Consumer: ${record.value.username}` })}
            >
              Raw
            </Button>
            <ToDetailPageBtn
              key="detail"
              to="/consumers/detail/$username"
              params={{ username: record.value.username }}
            />
            <DeleteResourceBtn
              key="delete"
              name="Consumer"
              target={record.value.username}
              api={`${API_CONSUMERS}/${record.value.username}`}
              onSuccess={refetch}
            />
          </Space>,
        ],
      },
    ];
  }, [refetch]);

  return (
    <AntdConfigProvider>
      <BulkDeleteBar
        {...bulkBarProps}
        resourceName="Consumer"
        apiBase={API_CONSUMERS}
      />
      <ProTable
        columns={columns}
        dataSource={data?.list}
        rowKey={(record) => record.value.username}
        loading={isLoading}
        search={false}
        rowSelection={rowSelection}
        options={{ density: true, fullScreen: false, reload: true, setting: true }}
        dateFormatter="string"
        headerTitle="Consumers"
        pagination={pagination}
        cardProps={{ bodyStyle: { padding: 0 } }}
        expandable={{
          expandedRowRender: (record) => <ConsumerExpandedRow consumer={record.value} />,
          rowExpandable: () => true,
        }}
        toolBarRender={() => [
          <SearchInput key="search" placeholder="Search consumers..." onSearch={(name) => setParams({ name, page: 1 })} />,
          <ToAddPageBtn key="add" label="Add Consumer" to="/consumers/add" />,
        ]}
      />
      <RawDrawer
        open={!!rawTarget}
        onClose={() => setRawTarget(null)}
        api={rawTarget?.api ?? ''}
        title={rawTarget?.title ?? ''}
      />
    </AntdConfigProvider>
  );
}

function RouteComponent() {
  return (
    <>
      <PageHeader title="Consumers" />
      <ConsumersList />
    </>
  );
}

export const Route = createFileRoute('/consumers/')({
  component: RouteComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getConsumerListQueryOptions(deps)),
});
