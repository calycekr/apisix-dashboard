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

import { getStreamRouteListQueryOptions, useStreamRouteList } from '@/apis/hooks';
import type { WithServiceIdFilter } from '@/apis/routes';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { StreamRouteExpandedRow } from '@/components/page/ExpandedRowComponents';
import PageHeader from '@/components/page/PageHeader';
import { RawDrawer } from '@/components/page/RawDrawer';
import { ResourceSortSelect } from '@/components/page/ResourceSortSelect';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn } from '@/components/page/ToAddPageBtn';
import { StreamRoutesErrorComponent } from '@/components/page-slice/stream_routes/ErrorComponent';
import { StatusSwitch } from '@/components/StatusTag';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_STREAM_ROUTES } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import { renderUnixDateTime, unixFieldSorter } from '@/utils/columns';
import { useBulkActions } from '@/utils/useBulkActions';
import type { ListPageKeys } from '@/utils/useTablePagination';

export type StreamRouteListProps = {
  routeKey: Extract<
    ListPageKeys,
    '/stream_routes/' | '/services/detail/$id/stream_routes/'
  >;
  detailLink: (record: APISIXType['RespStreamRouteItem']) => React.ReactNode;
  defaultParams?: Partial<WithServiceIdFilter>;
};

export const StreamRouteList = (props: StreamRouteListProps) => {
  const { routeKey, detailLink, defaultParams } = props;
  const { data, isLoading, refetch, pagination, setParams, sortBy, sortOrder, setSort } = useStreamRouteList(
    routeKey,
    defaultParams
  );
  const { rowSelection, bulkBarProps } = useBulkActions(refetch);
  const [rawTarget, setRawTarget] = useState<{ api: string; title: string } | null>(null);

  const columns = useMemo<
    ProColumns<APISIXType['RespStreamRouteItem']>[]
  >(() => {
    return [
      {
        dataIndex: ['value', 'id'],
        title: 'ID',
        key: 'id',
        width: 120,
        render: (_, record) => detailLink(record),
      },
      {
        dataIndex: ['value', 'server_addr'],
        title: 'Server Addr',
        key: 'server_addr',
        valueType: 'text',
        render: (_, record) => {
          const v = record.value as APISIXType['StreamRoute'];
          return v.server_addr || '-';
        },
      },
      {
        dataIndex: ['value', 'server_port'],
        title: 'Server Port',
        key: 'server_port',
        valueType: 'text',
        render: (_, record) => {
          const v = record.value as APISIXType['StreamRoute'];
          return v.server_port ?? '-';
        },
      },
      {
        dataIndex: ['value', 'remote_addr'],
        title: 'Remote Addr',
        key: 'remote_addr',
        valueType: 'text',
        render: (_, record) => {
          const v = record.value as APISIXType['StreamRoute'];
          return v.remote_addr || '-';
        },
      },
      {
        dataIndex: ['value', 'sni'],
        title: 'SNI',
        key: 'sni',
        valueType: 'text',
        ellipsis: true,
        render: (_, record) => {
          const v = record.value as APISIXType['StreamRoute'];
          return v.sni || '-';
        },
      },
      {
        dataIndex: ['value', 'upstream_id'],
        title: 'Upstream',
        key: 'upstream_id',
        render: (_, record) => {
          const v = record.value as APISIXType['StreamRoute'];
          return v.upstream_id || (v.upstream ? 'Inline' : '-');
        },
      },
      {
        dataIndex: ['value', 'status'],
        title: 'Status',
        key: 'status',
        filters: [
          { text: 'Enabled', value: 1 },
          { text: 'Disabled', value: 0 },
        ],
        onFilter: (value, record) => record.value.status === value,
        render: (_, record) => (
          <StatusSwitch
            status={record.value.status}
            api={`${API_STREAM_ROUTES}/${record.value.id}`}
          />
        ),
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
        fixed: 'right',
        render: (_, record) => [
          <Button
            key="raw"
            size="small"
            type="link"
            onClick={() => setRawTarget({ api: `${API_STREAM_ROUTES}/${record.value.id}`, title: `Stream Route: ${record.value.id}` })}
          >
            Raw
          </Button>,
        ],
      },
    ];
  }, [detailLink]);

  return (
    <AntdConfigProvider>
      <BulkDeleteBar
        {...bulkBarProps}
        resourceName="Stream Route"
        apiBase={API_STREAM_ROUTES}
        showStatusActions
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
          persistenceKey: 'table-v2:stream-routes',
          persistenceType: 'localStorage',
        }}
        dateFormatter="string"
        headerTitle={<Space><span>Stream Routes</span><ToAddPageBtn label="Add Stream Route" to={`${routeKey}add`} /></Space>}
        pagination={pagination}
        cardProps={{ bodyStyle: { padding: 0 } }}
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: (record) => <StreamRouteExpandedRow route={record.value as APISIXType['StreamRoute']} />,
          rowExpandable: () => true,
        }}
        toolBarRender={() => [
          <SearchInput key="search" placeholder="Search stream routes..." onSearch={(name) => setParams({ name, page: 1 })} />,
          <ResourceSortSelect key="sort" sortBy={sortBy} sortOrder={sortOrder} onChange={setSort} />,
        ]}
      />
      <RawDrawer
        open={!!rawTarget}
        onClose={() => setRawTarget(null)}
        onSaved={async () => { await refetch(); }}
        api={rawTarget?.api ?? ''}
        title={rawTarget?.title ?? ''}
      />
    </AntdConfigProvider>
  );
};

function StreamRouteComponent() {

  return (
    <>
      <PageHeader title="Stream Routes" />
      <StreamRouteList
        routeKey="/stream_routes/"
        detailLink={(record) => (
          <Link to="/stream_routes/detail/$id" params={{ id: record.value.id }}>
            <Typography.Text strong>{record.value.id}</Typography.Text>
          </Link>
        )}
      />
    </>
  );
}

export const Route = createFileRoute('/stream_routes/')({
  component: StreamRouteComponent,
  errorComponent: StreamRoutesErrorComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getStreamRouteListQueryOptions(deps)),
});
