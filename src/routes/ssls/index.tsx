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
import { Button, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { getSSLListQueryOptions, useSSLList } from '@/apis/hooks';
import { CopyableID } from '@/components/CopyableID';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import { SSLExpandedRow } from '@/components/page/ExpandedRowComponents';
import PageHeader from '@/components/page/PageHeader';
import { RawDrawer } from '@/components/page/RawDrawer';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { StatusSwitch } from '@/components/StatusTag';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_SSLS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import { useBulkActions } from '@/utils/useBulkActions';

function RouteComponent() {
  const { data, isLoading, refetch, pagination, setParams } = useSSLList();
  const { rowSelection, bulkBarProps } = useBulkActions(refetch);
  const [rawTarget, setRawTarget] = useState<{ api: string; title: string } | null>(null);

  const columns = useMemo<ProColumns<APISIXType['RespSSLItem']>[]>(() => {
    return [
      {
        dataIndex: ['value', 'id'],
        title: 'ID',
        key: 'id',
        width: 120,
        render: (_, record) => <CopyableID id={record.value.id} />,
      },
      {
        dataIndex: ['value', 'sni'],
        title: 'SNI',
        key: 'sni',
        ellipsis: true,
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
        filters: [
          { text: 'Enabled', value: 1 },
          { text: 'Disabled', value: 0 },
        ],
        onFilter: (value, record) => record.value.status === value,
        render: (_, record) => (
          <StatusSwitch
            status={record.value.status}
            api={`${API_SSLS}/${record.value.id}`}
          />
        ),
      },
      {
        dataIndex: ['value', 'validity_end'],
        title: 'Expiry',
        key: 'validity_end',
        render: (_, record) => {
          const end = (record.value as Record<string, unknown>)['validity_end'] as number | undefined;
          if (!end) return '-';
          const endMs = Number(end) * 1000;
          const now = Date.now();
          const daysLeft = Math.ceil((endMs - now) / (1000 * 60 * 60 * 24));
          const dateStr = dayjs.unix(Number(end)).format('YYYY-MM-DD HH:mm:ss');
          if (endMs < now) {
            return (
              <Space>
                <Tag color="error">Expired</Tag>
                <span>{dateStr}</span>
              </Space>
            );
          }
          if (daysLeft <= 30) {
            return (
              <Space>
                <Tag color="warning">Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</Tag>
                <span>{dateStr}</span>
              </Space>
            );
          }
          return (
            <Space>
              <Tag color="success">Valid ({daysLeft} days)</Tag>
              <span>{dateStr}</span>
            </Space>
          );
        },
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
        width: 200,
        render: (_, record) => [
          <Space key="actions">
            <Button
              key="raw"
              size="small"
              type="text"
              onClick={() => setRawTarget({ api: `${API_SSLS}/${record.value.id}`, title: `SSL: ${record.value.id}` })}
            >
              Raw
            </Button>
            <ToDetailPageBtn
              key="detail"
              to="/ssls/detail/$id"
              params={{ id: record.value.id }}
            />
            <DeleteResourceBtn
              key="delete"
              name="SSL"
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
      <PageHeader title="SSLs" />
      <AntdConfigProvider>
        <BulkDeleteBar
          {...bulkBarProps}
          resourceName="SSL"
          apiBase={API_SSLS}
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
          headerTitle="SSLs"
          pagination={pagination}
          cardProps={{ bodyStyle: { padding: 0 } }}
          expandable={{
            expandedRowRender: (record) => <SSLExpandedRow ssl={record.value as Record<string, unknown>} />,
            rowExpandable: () => true,
          }}
          toolBarRender={() => [
            <SearchInput key="search" placeholder="Search SSLs..." onSearch={(name) => setParams({ name, page: 1 })} />,
            <ToAddPageBtn key="add" label="Add SSL" to="/ssls/add" />,
          ]}
        />
        <RawDrawer
          open={!!rawTarget}
          onClose={() => setRawTarget(null)}
          api={rawTarget?.api ?? ''}
          title={rawTarget?.title ?? ''}
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
