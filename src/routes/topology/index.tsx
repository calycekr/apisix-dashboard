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
import '@xyflow/react/dist/style.css';

import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Background,
  Controls,
  type Edge,
  type Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { Spin, Tag, theme, Typography } from 'antd';
import dagre from 'dagre';
import { useCallback, useEffect, useMemo } from 'react';

import { getTopologyData, type TopologyData } from '@/apis/topology';
import PageHeader from '@/components/page/PageHeader';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

const NODE_COLORS: Record<string, { bg: string; border: string; tag: string }> = {
  route: { bg: '#e6f4ff', border: '#1677ff', tag: 'blue' },
  streamRoute: { bg: '#e6fffb', border: '#13c2c2', tag: 'cyan' },
  service: { bg: '#f6ffed', border: '#52c41a', tag: 'green' },
  upstream: { bg: '#f9f0ff', border: '#722ed1', tag: 'purple' },
};

function buildGraphLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 120 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function buildNodesAndEdges(data: TopologyData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Upstream nodes
  for (const u of data.upstreams) {
    nodes.push({
      id: `upstream-${u.id}`,
      type: 'default',
      data: {
        label: (
          <NodeLabel
            type="upstream"
            name={u.name || u.id}
            detail={u.nodes.length ? u.nodes.slice(0, 2).join(', ') + (u.nodes.length > 2 ? '...' : '') : ''}
          />
        ),
      },
      position: { x: 0, y: 0 },
      style: nodeStyle('upstream'),
    });
  }

  // Service nodes
  for (const s of data.services) {
    nodes.push({
      id: `service-${s.id}`,
      type: 'default',
      data: {
        label: (
          <NodeLabel
            type="service"
            name={s.name || s.id}
            detail={s.hasInlineUpstream ? 'inline upstream' : ''}
          />
        ),
      },
      position: { x: 0, y: 0 },
      style: nodeStyle('service'),
    });

    if (s.upstream_id) {
      edges.push({
        id: `service-${s.id}->upstream-${s.upstream_id}`,
        source: `service-${s.id}`,
        target: `upstream-${s.upstream_id}`,
        animated: true,
        style: { stroke: '#722ed1' },
      });
    }
  }

  // Route nodes
  for (const r of data.routes) {
    nodes.push({
      id: `route-${r.id}`,
      type: 'default',
      data: {
        label: (
          <NodeLabel
            type="route"
            name={r.name || r.id}
            detail={r.uri || ''}
          />
        ),
      },
      position: { x: 0, y: 0 },
      style: nodeStyle('route'),
    });

    if (r.service_id) {
      edges.push({
        id: `route-${r.id}->service-${r.service_id}`,
        source: `route-${r.id}`,
        target: `service-${r.service_id}`,
        animated: true,
        style: { stroke: '#52c41a' },
      });
    }
    if (r.upstream_id) {
      edges.push({
        id: `route-${r.id}->upstream-${r.upstream_id}`,
        source: `route-${r.id}`,
        target: `upstream-${r.upstream_id}`,
        animated: true,
        style: { stroke: '#722ed1' },
      });
    }
  }

  // Stream Route nodes
  for (const r of data.streamRoutes) {
    nodes.push({
      id: `stream-route-${r.id}`,
      type: 'default',
      data: {
        label: (
          <NodeLabel
            type="streamRoute"
            name={r.name || r.id}
            detail=""
          />
        ),
      },
      position: { x: 0, y: 0 },
      style: nodeStyle('streamRoute'),
    });

    if (r.service_id) {
      edges.push({
        id: `stream-route-${r.id}->service-${r.service_id}`,
        source: `stream-route-${r.id}`,
        target: `service-${r.service_id}`,
        animated: true,
        style: { stroke: '#52c41a' },
      });
    }
    if (r.upstream_id) {
      edges.push({
        id: `stream-route-${r.id}->upstream-${r.upstream_id}`,
        source: `stream-route-${r.id}`,
        target: `upstream-${r.upstream_id}`,
        animated: true,
        style: { stroke: '#722ed1' },
      });
    }
  }

  const layoutNodes = buildGraphLayout(nodes, edges);
  return { nodes: layoutNodes, edges };
}

function nodeStyle(type: string): React.CSSProperties {
  const colors = NODE_COLORS[type] ?? NODE_COLORS.route;
  return {
    background: colors.bg,
    border: `2px solid ${colors.border}`,
    borderRadius: 8,
    padding: '8px 12px',
    width: NODE_WIDTH,
    fontSize: 12,
  };
}

function NodeLabel({ type, name, detail }: { type: string; name: string; detail: string }) {
  const colors = NODE_COLORS[type] ?? NODE_COLORS.route;
  const typeLabels: Record<string, string> = {
    route: 'Route',
    streamRoute: 'Stream',
    service: 'Service',
    upstream: 'Upstream',
  };
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <Tag color={colors.tag} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
          {typeLabels[type] ?? type}
        </Tag>
        <Typography.Text strong ellipsis style={{ fontSize: 12, maxWidth: 130 }}>
          {name}
        </Typography.Text>
      </div>
      {detail && (
        <Typography.Text type="secondary" ellipsis style={{ fontSize: 10, display: 'block' }}>
          {detail}
        </Typography.Text>
      )}
    </div>
  );
}

function TopologyGraph({ data }: { data: TopologyData }) {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(data),
    [data]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const isEmpty = nodes.length === 0;

  const onInit = useCallback((reactFlowInstance: { fitView: () => void }) => {
    reactFlowInstance.fitView();
  }, []);

  if (isEmpty) {
    return (
      <div style={{
        height: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px dashed ${token.colorBorderSecondary}`,
        borderRadius: 8,
      }}>
        <Typography.Text type="secondary">
          No resources found. Create routes, services, or upstreams to see the topology.
        </Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 200px)', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        onNodeDoubleClick={(_, node) => {
          // node.id format: "route-123", "service-456", "upstream-789", "stream-route-123"
          const id = node.id;
          if (id.startsWith('route-')) navigate({ to: '/routes/detail/$id', params: { id: id.slice(6) } });
          else if (id.startsWith('service-')) navigate({ to: '/services/detail/$id', params: { id: id.slice(8) } });
          else if (id.startsWith('upstream-')) navigate({ to: '/upstreams/detail/$id', params: { id: id.slice(9) } });
          else if (id.startsWith('stream-route-')) navigate({ to: '/stream_routes/detail/$id', params: { id: id.slice(13) } });
        }}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background gap={16} size={1} />
        <Controls />
        <Panel position="top-right">
          <div style={{
            background: token.colorBgContainer,
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            gap: 8,
            fontSize: 12,
          }}>
            <Tag color="blue">Route ({data.routes.length})</Tag>
            <Tag color="cyan">Stream Route ({data.streamRoutes.length})</Tag>
            <Tag color="green">Service ({data.services.length})</Tag>
            <Tag color="purple">Upstream ({data.upstreams.length})</Tag>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function TopologyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['topology'],
    queryFn: getTopologyData,
    staleTime: 30_000,
  });

  return (
    <>
      <PageHeader
        title="Service Topology"
        desc="Visualize connections between Routes, Services, and Upstreams"
      />
      {isLoading || !data ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
          <Spin size="large" />
        </div>
      ) : (
        <ReactFlowProvider>
          <TopologyGraph data={data} />
        </ReactFlowProvider>
      )}
    </>
  );
}

export const Route = createFileRoute('/topology/')({
  component: TopologyPage,
});
