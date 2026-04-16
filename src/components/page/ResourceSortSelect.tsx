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
import { Select } from 'antd';

type ResourceSortSelectProps = {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onChange: (next: { sort_by: string; sort_order: 'asc' | 'desc' }) => void;
};

const OPTIONS = [
  { label: 'Created At (oldest first)', value: 'create_time:asc' },
  { label: 'Created At (newest first)', value: 'create_time:desc' },
  { label: 'Updated At (oldest first)', value: 'update_time:asc' },
  { label: 'Updated At (newest first)', value: 'update_time:desc' },
  { label: 'ID (A → Z)', value: 'id:asc' },
  { label: 'ID (Z → A)', value: 'id:desc' },
  { label: 'Name (A → Z)', value: 'name:asc' },
  { label: 'Name (Z → A)', value: 'name:desc' },
];

export const ResourceSortSelect = ({ sortBy, sortOrder, onChange }: ResourceSortSelectProps) => {
  return (
    <Select
      style={{ minWidth: 220 }}
      value={`${sortBy}:${sortOrder}`}
      options={OPTIONS}
      onChange={(value) => {
        const [sort_by, sort_order] = value.split(':') as [string, 'asc' | 'desc'];
        onChange({ sort_by, sort_order });
      }}
    />
  );
};
