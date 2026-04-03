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
import { Tag, Tooltip } from 'antd';

const MAX_VISIBLE = 2;

export const renderPluginCount = (
  plugins: Record<string, unknown> | undefined
) => {
  if (!plugins) return '-';
  const names = Object.keys(plugins);
  if (names.length === 0) return '-';

  const visible = names.slice(0, MAX_VISIBLE);
  const remaining = names.length - MAX_VISIBLE;

  return (
    <span style={{ display: 'inline-flex', gap: 3, overflow: 'hidden', maxWidth: '100%' }}>
      {visible.map((n) => (
        <Tag key={n} style={{ margin: 0, fontSize: 11 }}>
          {n}
        </Tag>
      ))}
      {remaining > 0 && (
        <Tooltip title={names.slice(MAX_VISIBLE).join(', ')}>
          <Tag style={{ margin: 0, fontSize: 11 }}>+{remaining}</Tag>
        </Tooltip>
      )}
    </span>
  );
};
