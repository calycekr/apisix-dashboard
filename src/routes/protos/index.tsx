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

import { getProtoListQueryOptions, useProtoList } from '@/apis/hooks';
import { CopyableID } from '@/components/CopyableID';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { ResourceSortSelect } from '@/components/page/ResourceSortSelect';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_PROTOS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import { renderUnixDateTime, unixFieldSorter } from '@/utils/columns';
import { useBulkActions } from '@/utils/useBulkActions';

function RouteComponent() {
  const { data, isLoading, refetch, pagination, setParams, sortBy, sortOrder, setSort } = useProtoList();
  const { rowSelection, bulkBarProps } = useBulkActions(refetch);

  const columns = useMemo<
    ProColumns<APISIXType['RespProtoList']['data']['list'][number]>[]
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
        dataIndex: ['value', 'content'],
        title: 'Content Preview',
        key: 'content',
        render: (_, record) => {
          const content = record.value.content;
          if (!content) return '-';
          const preview = content.length > 80 ? content.slice(0, 80) + '…' : content;
          return (
            <Typography.Text code style={{ fontSize: 12 }}>
              {preview}
            </Typography.Text>
          );
        },
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
        title: 'Actions',
        valueType: 'option',
        key: 'option',
        width: 160,
        render: (_, record) => [
          <Space key="actions">
            <ToDetailPageBtn
              key="detail"
              to="/protos/detail/$id"
              params={{ id: record.value.id }}
            />
            <DeleteResourceBtn
              key="delete"
              name="Proto"
              target={record.value.id}
              api={`${API_PROTOS}/${record.value.id}`}
              onSuccess={refetch}
            />
          </Space>,
        ],
      },
    ];
  }, [refetch]);

  return (
    <>
      <PageHeader title="Protos" />
      <AntdConfigProvider>
        <BulkDeleteBar
          {...bulkBarProps}
          resourceName="Proto"
          apiBase={API_PROTOS}
        />
        <ProTable
          columns={columns}
          dataSource={data?.list || []}
          rowKey={(record) => record.value.id}
          loading={isLoading}
          search={false}
          rowSelection={rowSelection}
          options={{ density: true, fullScreen: false, reload: true, setting: true }}
          columnsState={{
            persistenceKey: 'table:protos',
            persistenceType: 'localStorage',
          }}
          dateFormatter="string"
          headerTitle={<Space><span>Protos</span><ToAddPageBtn label="Add Proto" to="/protos/add" /></Space>}
          pagination={pagination}
          cardProps={{ bodyStyle: { padding: 0 } }}
          toolBarRender={() => [
            <SearchInput key="search" placeholder="Search protos..." onSearch={(name) => setParams({ name, page: 1 })} />,
            <ResourceSortSelect key="sort" sortBy={sortBy} sortOrder={sortOrder} onChange={setSort} />,
          ]}
        />
      </AntdConfigProvider>
    </>
  );
}

export const Route = createFileRoute('/protos/')({
  component: RouteComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getProtoListQueryOptions(deps)),
});
