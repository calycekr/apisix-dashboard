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
import { useMemo, useState } from 'react';

import { getConsumerGroupListQueryOptions, useConsumerGroupList } from '@/apis/hooks';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { ConsumerGroupExpandedRow } from '@/components/page/ExpandedRowComponents';
import PageHeader from '@/components/page/PageHeader';
import { RawDrawer } from '@/components/page/RawDrawer';
import { ResourceSortSelect } from '@/components/page/ResourceSortSelect';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_CONSUMER_GROUPS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import { renderPluginCount, renderUnixDateTime, unixFieldSorter } from '@/utils/columns';
import { useBulkActions } from '@/utils/useBulkActions';

function ConsumerGroupsList() {
  const { data, isLoading, refetch, pagination, setParams, sortBy, sortOrder, setSort } = useConsumerGroupList();
  const { rowSelection, bulkBarProps } = useBulkActions(refetch);
  const [rawTarget, setRawTarget] = useState<{ api: string; title: string } | null>(null);

  const columns = useMemo<
    ProColumns<APISIXType['RespConsumerGroupItem']>[]
  >(() => {
    return [
      {
        dataIndex: ['value', 'id'],
        title: 'ID',
        key: 'id',
        width: 120,
        render: (_, record) => (
          <Link to="/consumer_groups/detail/$id" params={{ id: record.value.id }}>
            <Typography.Text strong>{record.value.id}</Typography.Text>
          </Link>
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
        render: (_, record) => renderPluginCount(record.value.plugins),
      },
      {
        dataIndex: ['value', 'create_time'],
        title: 'Created At',
        key: 'create_time',
        valueType: 'dateTime',
        defaultSortOrder: 'ascend',
        sorter: unixFieldSorter('create_time'),
        renderText: renderUnixDateTime,
      },
      {
        dataIndex: ['value', 'update_time'],
        title: 'Updated At',
        key: 'update_time',
        valueType: 'dateTime',
        sorter: unixFieldSorter('update_time'),
        renderText: renderUnixDateTime,
      },
      {
        title: 'RAW',
        valueType: 'option',
        key: 'option',
        width: 72,
        fixed: 'left',
        render: (_, record) => [
          <Button
            key="raw"
            size="small"
            type="link"
            onClick={() => setRawTarget({ api: `${API_CONSUMER_GROUPS}/${record.value.id}`, title: `Consumer Group: ${record.value.id}` })}
          >
            Raw
          </Button>,
        ],
      },
    ];
  }, []);

  return (
    <AntdConfigProvider>
      <BulkDeleteBar
        {...bulkBarProps}
        resourceName="Consumer Group"
        apiBase={API_CONSUMER_GROUPS}
      />
      <ProTable
        columns={columns}
        dataSource={data?.list}
        rowKey={(record) => record.value.id}
        loading={isLoading}
        search={false}
        rowSelection={rowSelection}
        options={{ density: true, fullScreen: false, reload: true, setting: true }}
        columnsState={{
          persistenceKey: 'table:consumer-groups',
          persistenceType: 'localStorage',
        }}
        dateFormatter="string"
        headerTitle={<Space><span>Consumer Groups</span><ToAddPageBtn label="Add Consumer Group" to="/consumer_groups/add" /></Space>}
        pagination={pagination}
        cardProps={{ bodyStyle: { padding: 0 } }}
        expandable={{
          expandedRowRender: (record) => <ConsumerGroupExpandedRow group={record.value} />,
          rowExpandable: () => true,
        }}
        toolBarRender={() => [
          <SearchInput key="search" placeholder="Search consumer groups..." onSearch={(name) => setParams({ name, page: 1 })} />,
          <ResourceSortSelect key="sort" sortBy={sortBy} sortOrder={sortOrder} onChange={setSort} />,
        ]}
      />
      <RawDrawer
        open={!!rawTarget}
        onClose={() => setRawTarget(null)}
        onSaved={refetch}
        api={rawTarget?.api ?? ''}
        title={rawTarget?.title ?? ''}
      />
    </AntdConfigProvider>
  );
}

function RouteComponent() {
  return (
    <>
      <PageHeader title="Consumer Groups" />
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
