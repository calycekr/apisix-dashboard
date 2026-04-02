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
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, Col, Row, Skeleton, Statistic, Table, Tag, theme, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ReactNode } from 'react';

import {
  getRecentChanges,
  getResourceCounts,
  type RecentItem,
  type ResourceCounts,
} from '@/apis/dashboard';
import { getOperationalAlerts, type OperationalAlerts } from '@/apis/operational';
import PageHeader from '@/components/page/PageHeader';
import IconCloudUpload from '~icons/material-symbols/cloud-upload';
import IconDns from '~icons/material-symbols/dns';
import IconGroup from '~icons/material-symbols/group';
import IconKey from '~icons/material-symbols/key';
import IconLock from '~icons/material-symbols/lock';
import IconPerson from '~icons/material-symbols/person';
import IconRoute from '~icons/material-symbols/route';
import IconStream from '~icons/material-symbols/stream';

dayjs.extend(relativeTime);

const RESOURCE_CARDS: {
  key: string;
  label: string;
  icon: ReactNode;
  color: string;
  to: string;
}[] = [
  { key: 'routes', label: 'Routes', icon: <IconRoute />, color: '#1677ff', to: '/routes' },
  { key: 'services', label: 'Services', icon: <IconDns />, color: '#52c41a', to: '/services' },
  { key: 'upstreams', label: 'Upstreams', icon: <IconCloudUpload />, color: '#722ed1', to: '/upstreams' },
  { key: 'consumers', label: 'Consumers', icon: <IconPerson />, color: '#fa8c16', to: '/consumers' },
  { key: 'ssls', label: 'SSLs', icon: <IconLock />, color: '#eb2f96', to: '/ssls' },
  { key: 'streamRoutes', label: 'Stream Routes', icon: <IconStream />, color: '#13c2c2', to: '/stream_routes' },
  { key: 'consumerGroups', label: 'Consumer Groups', icon: <IconGroup />, color: '#2f54eb', to: '/consumer_groups' },
  { key: 'secrets', label: 'Secrets', icon: <IconKey />, color: '#faad14', to: '/secrets' },
];

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  routes: 'blue',
  services: 'green',
  upstreams: 'purple',
  consumers: 'orange',
  ssls: 'magenta',
  streamRoutes: 'cyan',
  consumerGroups: 'geekblue',
  globalRules: 'volcano',
  pluginConfigs: 'lime',
  secrets: 'gold',
  protos: 'default',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  routes: 'Route',
  services: 'Service',
  upstreams: 'Upstream',
  consumers: 'Consumer',
  ssls: 'SSL',
  streamRoutes: 'Stream Route',
  consumerGroups: 'Consumer Group',
  globalRules: 'Global Rule',
  pluginConfigs: 'Plugin Config',
  secrets: 'Secret',
  protos: 'Proto',
};

function ResourceCountCards({ counts, isLoading }: { counts?: ResourceCounts; isLoading: boolean }) {
  const { token } = theme.useToken();

  return (
    <Row gutter={[16, 16]}>
      {RESOURCE_CARDS.map((card) => (
        <Col key={card.key} xs={12} sm={8} md={6} xl={6}>
          <Link to={card.to} style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              style={{ borderLeft: `3px solid ${card.color}` }}
              styles={{ body: { padding: '20px 24px' } }}
            >
              {isLoading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <Statistic
                  title={
                    <span style={{ color: token.colorTextSecondary, fontSize: 14 }}>
                      {card.label}
                    </span>
                  }
                  value={counts?.[card.key] ?? 0}
                  prefix={
                    <span style={{ color: card.color, fontSize: 22, marginRight: 4 }}>
                      {card.icon}
                    </span>
                  }
                />
              )}
            </Card>
          </Link>
        </Col>
      ))}
    </Row>
  );
}

function RecentChangesTable({ items, isLoading }: { items?: RecentItem[]; isLoading: boolean }) {
  const columns: ColumnsType<RecentItem> = [
    {
      title: 'Type',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 150,
      render: (type: string) => (
        <Tag color={RESOURCE_TYPE_COLORS[type] ?? 'default'}>
          {RESOURCE_TYPE_LABELS[type] ?? type}
        </Tag>
      ),
    },
    {
      title: 'Name / ID',
      key: 'name',
      render: (_, record) => (
        <Link to={record.detailPath}>
          <Typography.Text strong>{record.name || record.id}</Typography.Text>
        </Link>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 200,
      render: (ts: number) => (
        <Typography.Text type="secondary">
          {dayjs.unix(ts).fromNow()}
        </Typography.Text>
      ),
    },
  ];

  return (
    <Card title="Recent Changes" style={{ marginTop: 24 }}>
      <Table<RecentItem>
        columns={columns}
        dataSource={items}
        loading={isLoading}
        rowKey={(r) => `${r.resourceType}-${r.id}`}
        pagination={false}
        size="middle"
      />
    </Card>
  );
}

function OperationalAlertsSection({ alerts, isLoading }: { alerts?: OperationalAlerts; isLoading: boolean }) {
  if (isLoading || !alerts) return null;
  const { expiringSSLs, disabledRoutes } = alerts;
  const hasAlerts = expiringSSLs.length > 0 || disabledRoutes.length > 0;
  if (!hasAlerts) return null;

  return (
    <div style={{ marginTop: 24 }}>
      {expiringSSLs.length > 0 && (
        <Card
          title={
            <span>
              <Tag color="warning" style={{ marginRight: 8 }}>
                {expiringSSLs.length}
              </Tag>
              SSL Certificates Expiring Within 30 Days
            </span>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={expiringSSLs}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'SNI',
                dataIndex: 'sni',
                key: 'sni',
                render: (sni: string, record) => (
                  <Link to="/ssls/detail/$id" params={{ id: record.id }}>
                    <Typography.Text strong>{sni}</Typography.Text>
                  </Link>
                ),
              },
              {
                title: 'Expires',
                dataIndex: 'expiryDate',
                key: 'expiryDate',
              },
              {
                title: 'Days Left',
                dataIndex: 'daysLeft',
                key: 'daysLeft',
                render: (days: number) => (
                  <Tag color={days <= 0 ? 'error' : days <= 7 ? 'warning' : 'default'}>
                    {days <= 0 ? 'EXPIRED' : `${days} days`}
                  </Tag>
                ),
              },
            ]}
          />
        </Card>
      )}
      {disabledRoutes.length > 0 && (
        <Card
          title={
            <span>
              <Tag color="default" style={{ marginRight: 8 }}>
                {disabledRoutes.length}
              </Tag>
              Disabled Routes
            </span>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={disabledRoutes}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
                key: 'id',
                width: 120,
                render: (id: string) => (
                  <Link to="/routes/detail/$id" params={{ id }}>
                    <Typography.Text code style={{ fontSize: 12 }}>{id}</Typography.Text>
                  </Link>
                ),
              },
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => name || '-',
              },
              {
                title: 'URI',
                dataIndex: 'uri',
                key: 'uri',
                render: (uri: string) => uri || '-',
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}

function DashboardPage() {
  const {
    data: counts,
    isLoading: countsLoading,
  } = useQuery({
    queryKey: ['dashboard', 'resourceCounts'],
    queryFn: getResourceCounts,
    staleTime: 30_000,
  });

  const {
    data: recentChanges,
    isLoading: recentLoading,
  } = useQuery({
    queryKey: ['dashboard', 'recentChanges'],
    queryFn: getRecentChanges,
    staleTime: 30_000,
  });

  const {
    data: alerts,
    isLoading: alertsLoading,
  } = useQuery({
    queryKey: ['dashboard', 'operationalAlerts'],
    queryFn: getOperationalAlerts,
    staleTime: 60_000,
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        desc="Overview of your APISIX gateway resources"
      />
      <ResourceCountCards counts={counts} isLoading={countsLoading} />
      <OperationalAlertsSection alerts={alerts} isLoading={alertsLoading} />
      <RecentChangesTable items={recentChanges} isLoading={recentLoading} />
    </>
  );
}

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
});
