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
import { Space } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';

import { getGlobalRuleListQueryOptions, useGlobalRuleList } from '@/apis/hooks';
import { CopyableID } from '@/components/CopyableID';
import { BulkDeleteBar } from '@/components/page/BulkDeleteBar';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import { GlobalRuleExpandedRow } from '@/components/page/ExpandedRowComponents';
import PageHeader from '@/components/page/PageHeader';
import { SearchInput } from '@/components/page/SearchInput';
import { ToAddPageBtn, ToDetailPageBtn } from '@/components/page/ToAddPageBtn';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import { API_GLOBAL_RULES } from '@/config/constant';
import { queryClient } from '@/config/global';
import type { APISIXType } from '@/types/schema/apisix';
import { pageSearchSchema } from '@/types/schema/pageSearch';
import { renderPluginCount } from '@/utils/columns';
import { useBulkActions } from '@/utils/useBulkActions';

function GlobalRulesList() {
  const { data, isLoading, refetch, pagination, setParams } = useGlobalRuleList();
  const { rowSelection, bulkBarProps } = useBulkActions(refetch);

  const columns = useMemo<
    ProColumns<APISIXType['RespGlobalRuleItem']>[]
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
              to="/global_rules/detail/$id"
              params={{ id: record.value.id }}
            />
            <DeleteResourceBtn
              key="delete"
              name="Global Rule"
              target={record.value.id}
              api={`${API_GLOBAL_RULES}/${record.value.id}`}
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
        resourceName="Global Rule"
        apiBase={API_GLOBAL_RULES}
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
        headerTitle="Global Rules"
        pagination={pagination}
        cardProps={{ bodyStyle: { padding: 0 } }}
        expandable={{
          expandedRowRender: (record) => <GlobalRuleExpandedRow rule={record.value} />,
          rowExpandable: () => true,
        }}
        toolBarRender={() => [
          <SearchInput key="search" placeholder="Search global rules..." onSearch={(name) => setParams({ name, page: 1 })} />,
          <ToAddPageBtn key="add" label="Add Global Rule" to="/global_rules/add" />,
        ]}
      />
    </AntdConfigProvider>
  );
}

function RouteComponent() {
  return (
    <>
      <PageHeader title="Global Rules" />
      <GlobalRulesList />
    </>
  );
}

export const Route = createFileRoute('/global_rules/')({
  component: RouteComponent,
  validateSearch: pageSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    queryClient.ensureQueryData(getGlobalRuleListQueryOptions(deps)),
});
