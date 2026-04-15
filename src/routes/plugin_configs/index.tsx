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

import { getPluginConfigListQueryOptions, usePluginConfigList } from '@/apis/hooks';
import { CopyableID } from '@/components/CopyableID';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import { PluginConfigExpandedRow } from '@/components/page/ExpandedRowComponents';
import PageHeader from '@/components/page/PageHeader';
import { ResourceSortSelect } from '@/components/page/ResourceSortSelect';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_PLUGIN_CONFIGS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import { renderPluginCount } from '@/utils/columns';
import { useBulkActions } from '@/utils/useBulkActions';

function PluginConfigsList() {
  const { data, isLoading, refetch, pagination, setParams, sortBy, sortOrder, setSort } = usePluginConfigList();
  const { rowSelection, bulkBarProps } = useBulkActions(refetch);

  const columns = useMemo<
    ProColumns<APISIXType['RespPluginConfigItem']>[]
  >(() => {
    return [
      {
        dataIndex: ['value', 'id'],
        title: 'ID',
        key: 'id',
        width: 120,
        render: (_, record) => <CopyableID id={record.value.id} />,
      },
      {
        dataIndex: ['value', 'name'],
        title: 'Name',
        key: 'name',
        render: (_, record) => (
          <Typography.Text strong>{record.value.name || '-'}</Typography.Text>
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
              to="/plugin_configs/detail/$id"
              params={{ id: record.value.id }}
            />
            <DeleteResourceBtn
              key="delete"
              name="Plugin Config"
              target={record.value.id}
              api={`${API_PLUGIN_CONFIGS}/${record.value.id}`}
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
        resourceName="Plugin Config"
        apiBase={API_PLUGIN_CONFIGS}
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
          persistenceKey: 'table:plugin-configs',
          persistenceType: 'localStorage',
        }}
        dateFormatter="string"
        headerTitle={<Space><span>Plugin Configs</span><ToAddPageBtn label="Add Plugin Config" to="/plugin_configs/add" /></Space>}
        pagination={pagination}
        cardProps={{ bodyStyle: { padding: 0 } }}
        expandable={{
          expandedRowRender: (record) => <PluginConfigExpandedRow config={record.value} />,
          rowExpandable: () => true,
        }}
        toolBarRender={() => [
          <SearchInput key="search" placeholder="Search plugin configs..." onSearch={(name) => setParams({ name, page: 1 })} />,
          <ResourceSortSelect key="sort" sortBy={sortBy} sortOrder={sortOrder} onChange={setSort} />,
        ]}
      />
    </AntdConfigProvider>
  );
}

function RouteComponent() {
  return (
    <>
      <PageHeader title="Plugin Configs" />
      <PluginConfigsList />
    </>
  );
}

export const Route = createFileRoute('/plugin_configs/')({
  component: RouteComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getPluginConfigListQueryOptions(deps)),
});
