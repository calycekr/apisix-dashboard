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
import { Select, type SelectProps, Typography } from 'antd';
import { type ReactNode, useMemo, useState } from 'react';
import {
  type FieldValues,
  useController,
  type UseControllerProps,
} from 'react-hook-form';

import { PAGE_SIZE_MAX } from '@/config/constant';
import { req } from '@/config/req';

import { InputWrapper } from './InputWrapper';
import { genControllerProps } from './util';

type ResourceSelectProps<T extends FieldValues> = UseControllerProps<T> &
  Omit<SelectProps, 'value' | 'defaultValue' | 'options'> & {
    label?: ReactNode;
    description?: ReactNode;
    /** APISIX Admin API path, e.g., '/services' */
    resourceApi: string;
    /** Resource type label for display */
    resourceLabel: string;
  };

export const ResourceSelect = <T extends FieldValues>(
  props: ResourceSelectProps<T>
) => {
  const {
    controllerProps,
    restProps: { label, description, resourceApi, resourceLabel, ...restProps },
  } = genControllerProps(props, '');
  const {
    field: { value, onChange: fOnChange, ...restField },
    fieldState,
  } = useController<T>(controllerProps);
  const [open, setOpen] = useState(false);

  const { data: options, isLoading } = useQuery({
    queryKey: ['resource-select', resourceApi],
    queryFn: async () => {
      const pageSize = PAGE_SIZE_MAX;
      const maxPages = 20;
      const resourceMap = new Map<string, { id: string; name: string }>();

      for (let page = 1; page <= maxPages; page += 1) {
        const res = await req.get(resourceApi, {
          params: {
            page,
            page_size: pageSize,
          },
        });
        const list = res.data?.list;
        if (!Array.isArray(list) || list.length === 0) break;

        list.forEach((item: { value: Record<string, unknown> }) => {
          const id = String(item.value.id || item.value.username || '');
          if (!id) return;

          const name = String(item.value.name || item.value.desc || '');
          resourceMap.set(id, { id, name });
        });

        if (list.length < pageSize) break;
      }

      return Array.from(resourceMap.values());
    },
    staleTime: 30_000,
    enabled: open || !!value,
  });

  const selectOptions = useMemo(
    () =>
      (options ?? []).map((opt) => ({
        value: opt.id,
        searchText: `${opt.id} ${opt.name}`.toLowerCase(),
        label: (
          <span>
            <Typography.Text code style={{ fontSize: 12 }}>{opt.id}</Typography.Text>
            {opt.name && (
              <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {opt.name}
              </Typography.Text>
            )}
          </span>
        ),
      })),
    [options]
  );

  return (
    <InputWrapper
      label={label ?? `${resourceLabel} ID`}
      description={description ?? `Select an existing ${resourceLabel} or type an ID`}
      error={fieldState.error?.message}
    >
      <Select
        {...restField}
        {...restProps}
        value={value || undefined}
        onChange={(v) => fOnChange(v || undefined)}
        onOpenChange={setOpen}
        options={selectOptions}
        showSearch
        allowClear
        filterOption={(input, option) => {
          const q = input.toLowerCase().trim();
          if (!q) return true;
          const valueMatch = option?.value?.toString().toLowerCase().includes(q);
          const optionText = ((option as { searchText?: string } | undefined)?.searchText ?? '');
          return !!valueMatch || optionText.includes(q);
        }}
        loading={isLoading}
        placeholder={`Select ${resourceLabel}...`}
        style={{ width: '100%' }}
      />
    </InputWrapper>
  );
};
