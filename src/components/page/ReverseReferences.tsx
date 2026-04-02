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
import { Link } from '@tanstack/react-router';
import { Card, Empty, List, Tag, Typography } from 'antd';

import { fetchAllResources } from '@/apis/fetchAll';
import { getRouteListReq } from '@/apis/routes';
import { getServiceListReq } from '@/apis/services';
import { getStreamRouteListReq } from '@/apis/stream_routes';
import type { APISIXType } from '@/types/schema/apisix';

type ReverseReferencesProps = {
  resourceType: 'upstream' | 'service';
  resourceId: string;
};

export const ReverseReferences = ({ resourceType, resourceId }: ReverseReferencesProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['reverse-references', resourceType, resourceId],
    queryFn: async () => {
      const refs: Array<{ type: string; id: string; name?: string; detailPath: string }> = [];

      if (resourceType === 'upstream') {
        // Find routes and services referencing this upstream
        const [routes, services, streamRoutes] = await Promise.all([
          fetchAllResources<APISIXType['Route']>(getRouteListReq),
          fetchAllResources<APISIXType['Service']>(getServiceListReq),
          fetchAllResources<APISIXType['StreamRoute']>(getStreamRouteListReq),
        ]);
        for (const r of routes) {
          if (r.upstream_id === resourceId) {
            refs.push({ type: 'Route', id: r.id, name: r.name, detailPath: `/routes/detail/${r.id}` });
          }
        }
        for (const s of services) {
          if (s.upstream_id === resourceId) {
            refs.push({ type: 'Service', id: s.id, name: s.name, detailPath: `/services/detail/${s.id}` });
          }
        }
        for (const sr of streamRoutes) {
          if (sr.upstream_id === resourceId) {
            refs.push({ type: 'Stream Route', id: sr.id, detailPath: `/stream_routes/detail/${sr.id}` });
          }
        }
      } else if (resourceType === 'service') {
        // Find routes referencing this service
        const [routes, streamRoutes] = await Promise.all([
          fetchAllResources<APISIXType['Route']>(getRouteListReq),
          fetchAllResources<APISIXType['StreamRoute']>(getStreamRouteListReq),
        ]);
        for (const r of routes) {
          if (r.service_id === resourceId) {
            refs.push({ type: 'Route', id: r.id, name: r.name, detailPath: `/routes/detail/${r.id}` });
          }
        }
        for (const sr of streamRoutes) {
          if (sr.service_id === resourceId) {
            refs.push({ type: 'Stream Route', id: sr.id, detailPath: `/stream_routes/detail/${sr.id}` });
          }
        }
      }

      return refs;
    },
    staleTime: 120_000,
  });

  return (
    <Card
      title={`Referenced By (${data?.length ?? 0})`}
      size="small"
      style={{ marginTop: 16 }}
      loading={isLoading}
    >
      {!data?.length ? (
        <Empty description="No resources reference this item" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={data}
          renderItem={(item) => (
            <List.Item>
              <Tag>{item.type}</Tag>
              <Link to={item.detailPath}>
                <Typography.Text strong>{item.name || item.id}</Typography.Text>
              </Link>
              <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12, fontFamily: 'monospace' }}>
                {item.id}
              </Typography.Text>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};
