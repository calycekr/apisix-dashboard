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
import { Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';

import { getRouteListQueryOptions, useRouteList } from '@/apis/hooks';
import type { WithServiceIdFilter } from '@/apis/routes';
import { CopyableID } from '@/components/CopyableID';
import { LabelsDisplay } from '@/components/LabelsDisplay';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import { LabelSearchInput } from '@/components/page/LabelSearchInput';
import PageHeader from '@/components/page/PageHeader';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { StatusSwitch } from '@/components/StatusTag';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_ROUTES } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import { renderPluginCount } from '@/utils/columns';
import { useBulkActions } from '@/utils/useBulkActions';
import type { ListPageKeys } from '@/utils/useTablePagination';

export type RouteListProps = {
  routeKey: Extract<ListPageKeys, '/routes/' | '/services/detail/$id/routes/'>;
  defaultParams?: Partial<WithServiceIdFilter>;
  ToDetailBtn: (props: {
    record: APISIXType['RespRouteItem'];
  }) => React.ReactNode;
};

const RouteExpandedRow = ({ route }: { route: APISIXType['Route'] }) => {
  const plugins = route.plugins ? Object.entries(route.plugins) : [];
  const host = route.host || route.hosts?.join(', ') || '-';
  const methods = route.methods?.join(', ') || 'ANY';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '8px 0' }}>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Matching
        </Typography.Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography.Text style={{ fontSize: 13 }}>
            <strong>Methods:</strong> {methods}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 13 }}>
            <strong>Host:</strong> {host}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 13 }}>
            <strong>URI:</strong> <Typography.Text code>{route.uri || route.uris?.join(', ') || '/'}</Typography.Text>
          </Typography.Text>
          {route.remote_addr && (
            <Typography.Text style={{ fontSize: 13 }}>
              <strong>Remote Addr:</strong> {route.remote_addr}
            </Typography.Text>
          )}
        </div>
      </div>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Backend
        </Typography.Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {route.service_id && (
            <Typography.Text style={{ fontSize: 13 }}>
              <strong>Service:</strong>{' '}
              <Link to="/services/detail/$id" params={{ id: route.service_id }}>{route.service_id}</Link>
            </Typography.Text>
          )}
          {route.upstream_id && (
            <Typography.Text style={{ fontSize: 13 }}>
              <strong>Upstream:</strong>{' '}
              <Link to="/upstreams/detail/$id" params={{ id: route.upstream_id }}>{route.upstream_id}</Link>
            </Typography.Text>
          )}
          {route.upstream?.nodes && (
            <Typography.Text style={{ fontSize: 13 }}>
              <strong>Inline nodes:</strong>{' '}
              {Array.isArray(route.upstream.nodes)
                ? route.upstream.nodes.map((n) => `${n.host}:${n.port}`).join(', ')
                : Object.keys(route.upstream.nodes).join(', ')}
            </Typography.Text>
          )}
        </div>
      </div>
      {plugins.length > 0 && (
        <div style={{ gridColumn: '1 / -1' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            Plugins ({plugins.length})
          </Typography.Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {plugins.map(([name, cfg]) => {
              const entries = cfg && typeof cfg === 'object' ? Object.entries(cfg as Record<string, unknown>).slice(0, 3) : [];
              return (
                <Tag key={name} style={{ fontSize: 12, padding: '2px 8px' }}>
                  <strong>{name}</strong>
                  {entries.length > 0 && (
                    <span style={{ marginLeft: 6, color: 'var(--ant-color-text-secondary)' }}>
                      {entries.map(([k, v]) => `${k}=${typeof v === 'object' ? '...' : v}`).join(' ')}
                    </span>
                  )}
                </Tag>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const RouteList = (props: RouteListProps) => {
  const { routeKey, ToDetailBtn, defaultParams } = props;
  const { data, isLoading, refetch, pagination, setParams } = useRouteList(
    routeKey,
    defaultParams
  );
  const { rowSelection, bulkBarProps } = useBulkActions(refetch);

  // Collect all unique plugin names from current page for filter dropdown
  const pluginFilterOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of data?.list ?? []) {
      if (item.value.plugins) {
        for (const name of Object.keys(item.value.plugins)) {
          names.add(name);
        }
      }
    }
    return Array.from(names).sort().map((n) => ({ text: n, value: n }));
  }, [data?.list]);

  const columns = useMemo<ProColumns<APISIXType['RespRouteItem']>[]>(() => {
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
        dataIndex: ['value', 'host'],
        title: 'Host',
        key: 'host',
        ellipsis: true,
        render: (_, record) => {
          const host = record.value.host;
          const hosts = record.value.hosts;
          if (host) return <Typography.Text code style={{ fontSize: 12 }}>{host}</Typography.Text>;
          if (hosts?.length) return <Typography.Text code style={{ fontSize: 12 }}>{hosts[0]}{hosts.length > 1 ? ` +${hosts.length - 1}` : ''}</Typography.Text>;
          return <Typography.Text type="secondary">*</Typography.Text>;
        },
      },
      {
        dataIndex: ['value', 'uri'],
        title: 'URI',
        key: 'uri',
        ellipsis: true,
        render: (_, record) => {
          const uri = record.value.uri;
          const uris = record.value.uris;
          if (uri) return <Typography.Text code style={{ fontSize: 12 }}>{uri}</Typography.Text>;
          if (uris?.length) return <Typography.Text code style={{ fontSize: 12 }}>{uris[0]}{uris.length > 1 ? ` +${uris.length - 1}` : ''}</Typography.Text>;
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
        dataIndex: ['value', 'plugins'],
        title: 'Plugins',
        key: 'plugins',
        filters: pluginFilterOptions,
        onFilter: (value, record) =>
          !!record.value.plugins && Object.keys(record.value.plugins).includes(String(value)),
        render: (_, record) => renderPluginCount(record.value.plugins),
      },
      {
        dataIndex: ['value', 'priority'],
        title: 'Priority',
        key: 'priority',
        width: 80,
        hideInTable: true,
        renderText: (text) => text ?? 0,
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
            api={`${API_ROUTES}/${record.value.id}`}
          />
        ),
      },
      {
        dataIndex: ['value', 'labels'],
        title: 'Labels',
        key: 'labels',
        hideInTable: true,
        render: (_, record) => <LabelsDisplay labels={record.value.labels} />,
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
  }, [ToDetailBtn, refetch, pluginFilterOptions]);

  return (
    <AntdConfigProvider>
      <BulkDeleteBar
        {...bulkBarProps}
        resourceName="Route"
        apiBase={API_ROUTES}
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
        dateFormatter="string"
        headerTitle="Routes"
        pagination={pagination}
        cardProps={{ bodyStyle: { padding: 0 } }}
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: (record) => <RouteExpandedRow route={record.value} />,
          rowExpandable: () => true,
        }}
        toolBarRender={() => [
          <SearchInput key="search" placeholder="Search by name or URI..." onSearch={(q) => setParams({ name: q, uri: q, page: 1 })} />,
          <LabelSearchInput key="label" onSearch={(label) => setParams({ label, page: 1 })} />,
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
