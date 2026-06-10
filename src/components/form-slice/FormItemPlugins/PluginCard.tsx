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
import { Button, Card, Space, Tag, Typography } from 'antd';

import {
  getPluginCatalogEntry,
  getPluginDescription,
} from './pluginCatalog';
import { getPluginCategory } from './utils';

export type PluginCardProps = {
  name: string;
  desc?: string;
  config?: object;
  mode: 'add' | 'edit' | 'view';
  onAdd?: (name: string) => void;
  onEdit?: (name: string) => void;
  onDelete?: (name: string) => void;
  onView?: (name: string) => void;
  search?: string;
};

const HighlightText = ({ text, highlight }: { text: string; highlight?: string }) => {
  if (!highlight) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={index} style={{ backgroundColor: '#ffe58f', padding: 0 }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

function summarizeConfig(config?: object): string[] {
  if (!config || typeof config !== 'object') return [];
  const entries = Object.entries(config);
  if (entries.length === 0) return [];
  return entries
    .slice(0, 4)
    .map(([k, v]) => {
      if (typeof v === 'boolean') return `${k}: ${v ? 'on' : 'off'}`;
      if (typeof v === 'number' || typeof v === 'string') return `${k}: ${v}`;
      if (Array.isArray(v)) return `${k}: [${v.length}]`;
      if (typeof v === 'object' && v !== null) return `${k}: {...}`;
      return `${k}: ${String(v)}`;
    });
}

export const PluginCard = (props: PluginCardProps) => {
  const { name, desc, config, mode, onAdd, onEdit, onView, onDelete, search } = props;
  const summary = mode !== 'add' ? summarizeConfig(config) : [];
  const category = getPluginCategory(name);
  const catalogEntry = getPluginCatalogEntry(name);
  const description = getPluginDescription(name, desc);

  return (
    <Card
      bordered
      size="small"
      className="premium-plugin-card"
      data-testid={`plugin-${name}`}
      title={
        <Typography.Text strong style={{ fontSize: 13 }}>
          <HighlightText text={name} highlight={search} />
        </Typography.Text>
      }
      extra={
        <Space>
          {mode === 'add' && (
            <Button
              size="small"
              type="text"
              onClick={() => onAdd?.(name)}
            >
              Add
            </Button>
          )}
          {mode === 'view' && (
            <Button
              size="small"
              type="text"
              data-testid={`plugin-${name}-view`}
              onClick={() => onView?.(name)}
            >
              View
            </Button>
          )}
          {mode === 'edit' && (
            <>
              <Button
                size="small"
                type="text"
                data-testid={`plugin-${name}-edit`}
                onClick={() => onEdit?.(name)}
              >
                Edit
              </Button>
              <Button
                size="small"
                type="text"
                danger
                onClick={() => onDelete?.(name)}
              >
                Delete
              </Button>
            </>
          )}
        </Space>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Tag color={category.color} style={{ margin: 0, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{category.icon}</span>
          <span>{category.name}</span>
        </Tag>
      </div>
      {description && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          {description}
        </Typography.Text>
      )}
      {catalogEntry?.capabilities.length ? (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {catalogEntry.capabilities.map((capability) => (
            <Tag key={capability} bordered={false} style={{ margin: 0, fontSize: 11 }}>
              {capability}
            </Tag>
          ))}
        </div>
      ) : null}
      {summary.length > 0 && (
        <div style={{ marginTop: description ? 6 : 0, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {summary.map((s) => (
            <Tag key={s} style={{ margin: 0, fontSize: 11 }}>{s}</Tag>
          ))}
        </div>
      )}
    </Card>
  );
};
