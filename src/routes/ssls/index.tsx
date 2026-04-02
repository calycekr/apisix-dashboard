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
import { Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { getSSLListQueryOptions, useSSLList } from '@/apis/hooks';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { StatusTag } from '@/components/StatusTag';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_SSLS } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';

function RouteComponent() {
  const { data, isLoading, refetch, pagination } = useSSLList();
  const [sniFilter, setSniFilter] = useState('');

  const columns = useMemo<ProColumns<APISIXType['RespSSLItem']>[]>(() => {
    return [
      {
        dataIndex: ['value', 'sni'],
        title: 'SNI',
        key: 'sni',
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
        render: (_, record) => <StatusTag status={record.value.status} />,
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
        width: 160,
        render: (_, record) => [
          <Space key="actions">
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
        <ProTable
          columns={columns}
          dataSource={
            sniFilter
              ? (data?.list ?? []).filter((item) => {
                  const q = sniFilter.toLowerCase();
                  const sni = item.value.sni?.toLowerCase() ?? '';
                  const snis = item.value.snis?.map((s) => s.toLowerCase()) ?? [];
                  return sni.includes(q) || snis.some((s) => s.includes(q));
                })
              : data?.list
          }
          rowKey="id"
          loading={isLoading}
          search={false}
          options={{ density: false, fullScreen: false, reload: true, setting: true }}
          dateFormatter="string"
          headerTitle="SSLs"
          pagination={pagination}
          cardProps={{ bodyStyle: { padding: 0 } }}
          toolBarRender={() => [
            <SearchInput key="search" placeholder="Search by SNI..." onSearch={(q) => setSniFilter(q)} />,
            <ToAddPageBtn key="add" label="Add SSL" to="/ssls/add" />,
          ]}
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
