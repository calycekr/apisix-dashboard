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
import { Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { getRouteListQueryOptions, useRouteList } from '@/apis/hooks';
import type { WithServiceIdFilter } from '@/apis/routes';
import { MethodTags } from '@/components/MethodTags';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { StatusTag } from '@/components/StatusTag';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_ROUTES } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import type { ListPageKeys } from '@/utils/useTablePagination';

export type RouteListProps = {
  routeKey: Extract<ListPageKeys, '/routes/' | '/services/detail/$id/routes/'>;
  defaultParams?: Partial<WithServiceIdFilter>;
  ToDetailBtn: (props: {
    record: APISIXType['RespRouteItem'];
  }) => React.ReactNode;
};

export const RouteList = (props: RouteListProps) => {
  const { routeKey, ToDetailBtn, defaultParams } = props;
  const { data, isLoading, refetch, pagination, setParams } = useRouteList(
    routeKey,
    defaultParams
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const columns = useMemo<ProColumns<APISIXType['RespRouteItem']>[]>(() => {
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
        dataIndex: ['value', 'uri'],
        title: 'URI',
        key: 'uri',
        valueType: 'text',
        ellipsis: true,
        render: (_, record) => {
          const uri = record.value.uri;
          const uris = record.value.uris;
          if (uri) return uri;
          if (uris && uris.length > 0) return uris.join(', ');
          return '-';
        },
      },
      {
        dataIndex: ['value', 'methods'],
        title: 'Methods',
        key: 'methods',
        render: (_, record) => <MethodTags methods={record.value.methods} />,
      },
      {
        dataIndex: ['value', 'host'],
        title: 'Host',
        key: 'host',
        valueType: 'text',
        ellipsis: true,
        render: (_, record) => {
          const host = record.value.host;
          const hosts = record.value.hosts;
          if (host) return host;
          if (hosts && hosts.length > 0) return hosts.join(', ');
          return '-';
        },
      },
      {
        dataIndex: ['value', 'service_id'],
        title: 'Service',
        key: 'service_id',
        render: (_, record) => {
          const id = record.value.service_id;
          if (!id) return '-';
          return (
            <Typography.Link>
              <Link to="/services/detail/$id" params={{ id }}>
                {id}
              </Link>
            </Typography.Link>
          );
        },
      },
      {
        dataIndex: ['value', 'upstream_id'],
        title: 'Upstream',
        key: 'upstream_id',
        render: (_, record) => {
          const id = record.value.upstream_id;
          if (!id) return '-';
          return (
            <Typography.Link>
              <Link to="/upstreams/detail/$id" params={{ id }}>
                {id}
              </Link>
            </Typography.Link>
          );
        },
      },
      {
        dataIndex: ['value', 'priority'],
        title: 'Priority',
        key: 'priority',
        width: 80,
        renderText: (text) => text ?? 0,
      },
      {
        dataIndex: ['value', 'status'],
        title: 'Status',
        key: 'status',
        render: (_, record) => <StatusTag status={record.value.status} />,
      },
      {
        dataIndex: ['value', 'update_time'],
        title: 'Updated At',
        key: 'update_time',
        valueType: 'dateTime',
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
            <ToDetailBtn key="detail" record={record} />
            <DeleteResourceBtn
              key="delete"
              name="Route"
              target={record.value.id}
              api={`${API_ROUTES}/${record.value.id}`}
              onSuccess={refetch}
            />
          </Space>,
        ],
      },
    ];
  }, [ToDetailBtn, refetch]);

  return (
    <AntdConfigProvider>
      <BulkDeleteBar
        selectedCount={selectedRowKeys.length}
        resourceName="Route"
        apiBase={API_ROUTES}
        selectedIds={selectedRowKeys.map(String)}
        onComplete={() => { setSelectedRowKeys([]); refetch(); }}
        onClear={() => setSelectedRowKeys([])}
      />
      <ProTable
        columns={columns}
        dataSource={data?.list}
        rowKey={(record) => record.value.id}
        loading={isLoading}
        search={false}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        options={{ density: false, fullScreen: false, reload: true, setting: true }}
        dateFormatter="string"
        headerTitle="Routes"
        pagination={pagination}
        cardProps={{ bodyStyle: { padding: 0 } }}
        toolBarRender={() => [
          <SearchInput key="search" placeholder="Search by name or URI..." onSearch={(q) => setParams({ name: q, uri: q, page: 1 })} />,
          <ToAddPageBtn key="add" label="Add Route" to={`${routeKey}add`} />,
        ]}
      />
    </AntdConfigProvider>
  );
};

function RouteComponent() {
  return (
    <>
      <PageHeader title="Routes" />
      <RouteList
        routeKey="/routes/"
        ToDetailBtn={({ record }) => (
          <ToDetailPageBtn
            key="detail"
            to="/routes/detail/$id"
            params={{ id: record.value.id }}
          />
        )}
      />
    </>
  );
}

export const Route = createFileRoute('/routes/')({
  component: RouteComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getRouteListQueryOptions(deps)),
});
