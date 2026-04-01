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
import { Button, Card, Space, Typography } from 'antd';

export type PluginCardProps = {
  name: string;
  desc?: string;
  mode: 'add' | 'edit' | 'view';
  onAdd?: (name: string) => void;
  onEdit?: (name: string) => void;
  onDelete?: (name: string) => void;
  onView?: (name: string) => void;
};

export const PluginCard = (props: PluginCardProps) => {
  const { name, desc, mode, onAdd, onEdit, onView, onDelete } = props;
  return (
    <Card
      bordered
      size="small"
      data-testid={`plugin-${name}`}
      title={<Typography.Text strong>{name}</Typography.Text>}
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
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {desc}
      </Typography.Text>
    </Card>
  );
};
