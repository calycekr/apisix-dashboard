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
import { Button, Card, Col, Row, Skeleton, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ReactNode } from 'react';

import {
  getDashboardData,
  type OperationalAlerts,
  type PluginUsage,
  type RecentItem,
  type ResourceCounts,
} from '@/apis/dashboard';
import PageHeader from '@/components/page/PageHeader';
import IconArrowForward from '~icons/material-symbols/arrow-forward';
import IconCheckCircle from '~icons/material-symbols/check-circle';
import IconCloudUpload from '~icons/material-symbols/cloud-upload';
import IconDns from '~icons/material-symbols/dns';
import IconGroup from '~icons/material-symbols/group';
import IconKey from '~icons/material-symbols/key';
import IconLock from '~icons/material-symbols/lock';
import IconPerson from '~icons/material-symbols/person';
import IconRefresh from '~icons/material-symbols/refresh';
import IconRoute from '~icons/material-symbols/route';
import IconStream from '~icons/material-symbols/stream';
import IconWarning from '~icons/material-symbols/warning';

import classes from './Dashboard.module.css';

dayjs.extend(relativeTime);

const RESOURCE_CARDS: {
  key: string;
  label: string;
  icon: ReactNode;
  color: string;
  to: string;
}[] = [
  { key: 'routes', label: 'Routes', icon: <IconRoute />, color: '#1677ff', to: '/routes' },
  { key: 'services', label: 'Services', icon: <IconDns />, color: '#389e0d', to: '/services' },
  { key: 'upstreams', label: 'Upstreams', icon: <IconCloudUpload />, color: '#722ed1', to: '/upstreams' },
  { key: 'consumers', label: 'Consumers', icon: <IconPerson />, color: '#d46b08', to: '/consumers' },
  { key: 'ssls', label: 'SSL Certificates', icon: <IconLock />, color: '#c41d7f', to: '/ssls' },
  { key: 'streamRoutes', label: 'Stream Routes', icon: <IconStream />, color: '#08979c', to: '/stream_routes' },
  { key: 'consumerGroups', label: 'Consumer Groups', icon: <IconGroup />, color: '#2f54eb', to: '/consumer_groups' },
  { key: 'secrets', label: 'Secrets', icon: <IconKey />, color: '#ad6800', to: '/secrets' },
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

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className={classes.sectionHeader}>
      <div>
        <h2 className={classes.sectionTitle}>{title}</h2>
        <span className={classes.sectionDescription}>{description}</span>
      </div>
    </div>
  );
}

function ResourceCountCards({
  counts,
  alerts,
  isLoading,
}: {
  counts?: ResourceCounts;
  alerts?: OperationalAlerts;
  isLoading: boolean;
}) {
  const subMetrics: Record<string, string> = {};
  if (alerts?.disabledRoutes.length) {
    subMetrics.routes = `${alerts.disabledRoutes.length} disabled`;
  }
  if (alerts?.expiringSSLs.length) {
    const expired = alerts.expiringSSLs.filter((ssl) => ssl.daysLeft <= 0).length;
    subMetrics.ssls = expired
      ? `${expired} expired`
      : `${alerts.expiringSSLs.length} expiring soon`;
  }

  return (
    <section className={classes.section}>
      <SectionHeader
        title="Gateway resources"
        description="Open a resource collection to review or change its configuration."
      />
      <Row gutter={[12, 12]}>
        {RESOURCE_CARDS.map((resource) => (
          <Col key={resource.key} xs={12} sm={8} lg={6} xxl={3}>
            <Link to={resource.to} className={classes.resourceLink}>
              <Card
                className={classes.resourceCard}
                styles={{ body: { padding: 14 } }}
              >
                {isLoading ? (
                  <Skeleton active title={false} paragraph={{ rows: 2, width: ['75%', '45%'] }} />
                ) : (
                  <div className={classes.resourceBody}>
                    <span
                      className={classes.resourceIcon}
                      style={{
                        color: resource.color,
                        background: `color-mix(in srgb, ${resource.color} 12%, transparent)`,
                      }}
                    >
                      {resource.icon}
                    </span>
                    <div className={classes.resourceContent}>
                      <span className={classes.resourceLabel}>{resource.label}</span>
                      <div className={classes.resourceMetric}>
                        <span className={classes.resourceCount}>
                          {counts?.[resource.key] ?? 0}
                        </span>
                        <span className={classes.resourceArrow}>
                          <IconArrowForward />
                        </span>
                      </div>
                      {subMetrics[resource.key] && (
                        <span className={classes.resourceAlert}>
                          {subMetrics[resource.key]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </section>
  );
}

function RecentChangesPanel({ items, isLoading }: { items?: RecentItem[]; isLoading: boolean }) {
  const columns: ColumnsType<RecentItem> = [
    {
      title: 'Resource',
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
      title: 'Name or ID',
      key: 'name',
      ellipsis: true,
      render: (_, record) => (
        <Link to={record.detailPath}>
          <Typography.Text strong className={classes.recentName}>
            {record.name || record.id}
          </Typography.Text>
        </Link>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 130,
      align: 'right',
      render: (timestamp: number) => (
        <Typography.Text type="secondary">
          {dayjs.unix(timestamp).fromNow()}
        </Typography.Text>
      ),
    },
  ];

  return (
    <Card
      className={classes.panel}
      title={
        <div className={classes.panelTitle}>
          <span className={classes.panelTitleText}>Recent changes</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Latest 10
          </Typography.Text>
        </div>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<RecentItem>
        columns={columns}
        dataSource={items}
        loading={isLoading}
        rowKey={(record) => `${record.resourceType}-${record.id}`}
        pagination={false}
        size="middle"
        scroll={{ x: 520 }}
      />
    </Card>
  );
}

function OperationalStatusPanel({
  alerts,
  isLoading,
}: {
  alerts?: OperationalAlerts;
  isLoading: boolean;
}) {
  if (isLoading || !alerts) {
    return (
      <Card className={classes.panel} title="Operational status">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  const warningSSLCertificates = alerts.expiringSSLs.slice(0, 3);
  const disabledRoutes = alerts.disabledRoutes.slice(0, 3);
  const hasWarnings = warningSSLCertificates.length > 0 || disabledRoutes.length > 0;

  return (
    <Card
      className={classes.panel}
      title={<span className={classes.panelTitleText}>Operational status</span>}
      styles={{ body: { padding: 0 } }}
    >
      <div className={classes.statusSummary}>
        <div className={classes.statusMetric}>
          <span className={classes.statusValue}>{alerts.disabledRoutes.length}</span>
          <span className={classes.statusLabel}>Disabled routes</span>
        </div>
        <div className={classes.statusMetric}>
          <span className={classes.statusValue}>{alerts.expiringSSLs.length}</span>
          <span className={classes.statusLabel}>Expiring SSLs</span>
        </div>
        <div className={classes.statusMetric}>
          <span className={classes.statusValue}>{alerts.upstreamsWithHealthCheck.length}</span>
          <span className={classes.statusLabel}>Health checks</span>
        </div>
      </div>
      {hasWarnings ? (
        <div className={classes.statusList}>
          {warningSSLCertificates.map((ssl) => (
            <Link
              key={`ssl-${ssl.id}`}
              to="/ssls/detail/$id"
              params={{ id: ssl.id }}
              className={classes.statusRow}
            >
              <span className={classes.statusIcon}><IconWarning /></span>
              <span className={classes.statusRowContent}>
                <span className={classes.statusRowTitle}>{ssl.sni}</span>
                <span className={classes.statusRowDetail}>
                  {ssl.daysLeft <= 0
                    ? `Expired ${Math.abs(ssl.daysLeft)} days ago`
                    : `Expires in ${ssl.daysLeft} days`}
                </span>
              </span>
              <Tag color={ssl.daysLeft <= 0 ? 'error' : 'warning'}>
                {ssl.daysLeft <= 0 ? 'Expired' : 'SSL'}
              </Tag>
            </Link>
          ))}
          {disabledRoutes.map((route) => (
            <Link
              key={`route-${route.id}`}
              to="/routes/detail/$id"
              params={{ id: route.id }}
              className={classes.statusRow}
            >
              <span className={classes.statusIcon}><IconWarning /></span>
              <span className={classes.statusRowContent}>
                <span className={classes.statusRowTitle}>{route.name || route.id}</span>
                <span className={classes.statusRowDetail}>{route.uri || 'No URI configured'}</span>
              </span>
              <Tag>Disabled</Tag>
            </Link>
          ))}
          {(alerts.expiringSSLs.length > warningSSLCertificates.length ||
            alerts.disabledRoutes.length > disabledRoutes.length) && (
            <div className={classes.healthyState}>
              Additional warnings are available in the corresponding resource lists.
            </div>
          )}
        </div>
      ) : (
        <div className={classes.healthyState}>
          <span className={classes.healthyIcon}><IconCheckCircle /></span>
          <span>No disabled routes or expiring certificates detected.</span>
        </div>
      )}
    </Card>
  );
}

function PluginUsagePanel({ plugins, isLoading }: { plugins?: PluginUsage[]; isLoading: boolean }) {
  return (
    <Card
      className={classes.panel}
      title={<span className={classes.panelTitleText}>Most used plugins</span>}
      styles={{ body: { padding: 0 } }}
    >
      {isLoading ? (
        <div style={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : plugins?.length ? (
        <div className={classes.pluginList}>
          {plugins.map((plugin) => (
            <div key={plugin.name} className={classes.pluginRow}>
              <span className={classes.pluginName}>{plugin.name}</span>
              <span className={classes.pluginCount}>{plugin.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={classes.healthyState}>No route plugin usage was found.</div>
      )}
    </Card>
  );
}

function DashboardPage() {
  const {
    data: dashboardData,
    dataUpdatedAt,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'data'],
    queryFn: getDashboardData,
    staleTime: 60_000,
  });

  return (
    <div className={classes.dashboard}>
      <PageHeader
        title="Dashboard"
        desc="Gateway configuration and operational overview"
        extra={
          <div className={classes.headerMeta}>
            {dataUpdatedAt > 0 && (
              <span className={classes.updatedAt}>
                Updated {dayjs(dataUpdatedAt).fromNow()}
              </span>
            )}
            <Button
              icon={<IconRefresh />}
              loading={isFetching}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <ResourceCountCards
        counts={dashboardData?.counts}
        alerts={dashboardData?.alerts}
        isLoading={isLoading}
      />

      <section className={classes.section}>
        <SectionHeader
          title="Activity and health"
          description="Review recent configuration changes and items requiring attention."
        />
        <div className={classes.contentGrid}>
          <RecentChangesPanel
            items={dashboardData?.recentChanges}
            isLoading={isLoading}
          />
          <div className={classes.sideStack}>
            <OperationalStatusPanel
              alerts={dashboardData?.alerts}
              isLoading={isLoading}
            />
            <PluginUsagePanel
              plugins={dashboardData?.alerts.pluginUsage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
});
