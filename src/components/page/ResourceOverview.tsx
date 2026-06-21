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
import { Link } from '@tanstack/react-router';
import { Card, Descriptions, Tag, Typography } from 'antd';

import { isRecord } from '@/utils/apisixEditable';

import classes from './ResourceOverview.module.css';
import { useReverseReferences } from './reverseReferencesData';

type RelationshipKey = 'service_id' | 'upstream_id' | 'group_id';

const relationshipLabels: Record<RelationshipKey, string> = {
  service_id: 'Service',
  upstream_id: 'Upstream',
  group_id: 'Consumer Group',
};

const formatTimestamp = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000));
};

const formatStatus = (value: unknown) => {
  if (value === 1) return <Tag color="success">Enabled</Tag>;
  if (value === 0) return <Tag>Disabled</Tag>;
  return <Typography.Text type="secondary">Not specified</Typography.Text>;
};

const RelationshipLink = ({ field, id }: { field: RelationshipKey; id: string }) => {
  if (field === 'service_id') {
    return <Link to="/services/detail/$id" params={{ id }}>{id}</Link>;
  }
  if (field === 'upstream_id') {
    return <Link to="/upstreams/detail/$id" params={{ id }}>{id}</Link>;
  }
  return <Link to="/consumer_groups/detail/$id" params={{ id }}>{id}</Link>;
};

const countNodes = (nodes: unknown): number => {
  if (Array.isArray(nodes)) return nodes.length;
  return isRecord(nodes) ? Object.keys(nodes).length : 0;
};

type ResourceOverviewProps = {
  data: unknown;
  referenceContext?: {
    resourceType: 'upstream' | 'service';
    resourceId: string;
  };
};

export const ResourceOverview = ({ data, referenceContext }: ResourceOverviewProps) => {
  const referencesQuery = useReverseReferences(
    referenceContext?.resourceType ?? 'service',
    referenceContext?.resourceId ?? '',
    !!referenceContext
  );
  if (!isRecord(data)) return null;

  const plugins = isRecord(data.plugins) ? Object.keys(data.plugins) : [];
  const labels = isRecord(data.labels) ? Object.entries(data.labels) : [];
  const relationships = (Object.keys(relationshipLabels) as RelationshipKey[])
    .map((field) => ({ field, value: data[field] }))
    .filter((item): item is { field: RelationshipKey; value: string } =>
      typeof item.value === 'string' && item.value.length > 0
    );
  const nodeCount = countNodes(data.nodes) || (isRecord(data.upstream) ? countNodes(data.upstream.nodes) : 0);
  const identity = data.name ?? data.username ?? data.id;

  return (
    <div className={classes.root}>
      <Card className={classes.summaryCard}>
        <div className={classes.eyebrow}>Resource overview</div>
        <div className={classes.summaryHeading}>
          <div>
            <Typography.Title level={3} className={classes.title}>
              {typeof identity === 'string' ? identity : 'APISIX Resource'}
            </Typography.Title>
            {typeof data.desc === 'string' && data.desc && (
              <Typography.Paragraph type="secondary" className={classes.description}>
                {data.desc}
              </Typography.Paragraph>
            )}
          </div>
          {'status' in data && formatStatus(data.status)}
        </div>
      </Card>

      <div className={classes.grid}>
        <Card title="Identity" className={classes.card}>
          <Descriptions column={1} size="small" colon={false}>
            {'id' in data && (
              <Descriptions.Item label="ID">
                <Typography.Text code copyable>
                  {String(data.id)}
                </Typography.Text>
              </Descriptions.Item>
            )}
            {'username' in data && (
              <Descriptions.Item label="Username">{String(data.username)}</Descriptions.Item>
            )}
            {'manager' in data && (
              <Descriptions.Item label="Manager">{String(data.manager)}</Descriptions.Item>
            )}
            {'type' in data && typeof data.type === 'string' && (
              <Descriptions.Item label="Type">{data.type}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="Lifecycle" className={classes.card}>
          <Descriptions column={1} size="small" colon={false}>
            <Descriptions.Item label="Created">
              {formatTimestamp(data.create_time)}
            </Descriptions.Item>
            <Descriptions.Item label="Last updated">
              {formatTimestamp(data.update_time)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Configuration" className={classes.card}>
          <Descriptions column={1} size="small" colon={false}>
            <Descriptions.Item label="Plugins">{plugins.length}</Descriptions.Item>
            <Descriptions.Item label="Labels">{labels.length}</Descriptions.Item>
            {nodeCount > 0 && <Descriptions.Item label="Nodes">{nodeCount}</Descriptions.Item>}
            {typeof data.uri === 'string' && (
              <Descriptions.Item label="URI">
                <Typography.Text code>{data.uri}</Typography.Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="Relationships" className={classes.card}>
          {relationships.length > 0 && (
            <Descriptions column={1} size="small" colon={false}>
              {relationships.map(({ field, value }) => (
                <Descriptions.Item key={field} label={relationshipLabels[field]}>
                  <RelationshipLink field={field} id={value} />
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
          {referenceContext && referencesQuery.isLoading && (
            <Typography.Text type="secondary">Checking dependent resources...</Typography.Text>
          )}
          {referenceContext && referencesQuery.error && (
            <Typography.Text type="danger">
              Dependencies could not be verified. Do not assume this resource is unused.
            </Typography.Text>
          )}
          {referenceContext && !referencesQuery.isLoading && !referencesQuery.error
            && (referencesQuery.data?.length ?? 0) > 0 && (
            <div className={classes.tagGroup}>
              <Typography.Text type="secondary" className={classes.tagLabel}>
                Referenced by
              </Typography.Text>
              <div className={classes.tags}>
                {referencesQuery.data?.map((reference) => (
                  <Link key={`${reference.type}:${reference.id}`} to={reference.detailPath}>
                    <Tag>{reference.type}: {reference.name || reference.id}</Tag>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {relationships.length === 0
            && (!referenceContext || (
              !referencesQuery.isLoading
              && !referencesQuery.error
              && referencesQuery.data?.length === 0
            )) && (
            <Typography.Text type="secondary">No linked resources</Typography.Text>
          )}
        </Card>
      </div>

      {(plugins.length > 0 || labels.length > 0) && (
        <Card title="Applied configuration" className={classes.card}>
          {plugins.length > 0 && (
            <div className={classes.tagGroup}>
              <Typography.Text type="secondary" className={classes.tagLabel}>
                Plugins
              </Typography.Text>
              <div className={classes.tags}>
                {plugins.map((plugin) => <Tag key={plugin}>{plugin}</Tag>)}
              </div>
            </div>
          )}
          {labels.length > 0 && (
            <div className={classes.tagGroup}>
              <Typography.Text type="secondary" className={classes.tagLabel}>
                Labels
              </Typography.Text>
              <div className={classes.tags}>
                {labels.map(([key, value]) => <Tag key={key}>{key}={String(value)}</Tag>)}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
