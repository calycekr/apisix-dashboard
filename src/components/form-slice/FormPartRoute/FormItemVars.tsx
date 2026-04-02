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
import { Button, Input, Select, Space, theme } from 'antd';
import { useCallback } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { InputWrapper } from '@/components/form/InputWrapper';
import IconAdd from '~icons/material-symbols/add';
import IconDelete from '~icons/material-symbols/delete';

import type { RoutePostType } from './schema';

// APISIX vars operators
const OPERATORS = [
  '==', '~=', '>', '>=', '<', '<=',
  '~~',       // regex match
  'in', 'not_in',
  'has', 'not_has',
];

// Common APISIX variables
const VARIABLE_OPTIONS = [
  { label: 'arg_*', options: [{ value: 'arg_name', label: 'arg_name' }] },
  { label: 'HTTP Headers', options: [
    { value: 'http_host', label: 'http_host' },
    { value: 'http_user_agent', label: 'http_user_agent' },
    { value: 'http_referer', label: 'http_referer' },
    { value: 'http_content_type', label: 'http_content_type' },
    { value: 'http_x_forwarded_for', label: 'http_x_forwarded_for' },
  ]},
  { label: 'Request', options: [
    { value: 'request_uri', label: 'request_uri' },
    { value: 'request_method', label: 'request_method' },
    { value: 'remote_addr', label: 'remote_addr' },
    { value: 'remote_port', label: 'remote_port' },
    { value: 'server_addr', label: 'server_addr' },
    { value: 'server_port', label: 'server_port' },
    { value: 'scheme', label: 'scheme' },
    { value: 'host', label: 'host' },
    { value: 'uri', label: 'uri' },
  ]},
  { label: 'Post Args', options: [
    { value: 'post_arg_name', label: 'post_arg_name' },
  ]},
  { label: 'Cookie', options: [
    { value: 'cookie_name', label: 'cookie_name' },
  ]},
];

type VarTuple = [string, string, string];

const parseVarsString = (val: string | undefined): VarTuple[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => Array.isArray(item) && item.length >= 3
      ) as VarTuple[];
    }
  } catch {
    // ignore
  }
  return [];
};

const serializeVars = (vars: VarTuple[]): string => {
  const clean = vars.filter(([v, o, val]) => v && o && val);
  if (clean.length === 0) return '';
  return JSON.stringify(clean);
};

export const FormItemVars = () => {
  const { control } = useFormContext<RoutePostType>();
  const { token } = theme.useToken();
  const {
    field: { value, onChange },
    fieldState,
  } = useController({ control, name: 'vars', defaultValue: '' });

  const vars = parseVarsString(value as string);

  const updateVars = useCallback(
    (newVars: VarTuple[]) => {
      onChange(serializeVars(newVars));
    },
    [onChange]
  );

  const addCondition = useCallback(() => {
    updateVars([...vars, ['', '==', '']]);
  }, [vars, updateVars]);

  const removeCondition = useCallback(
    (index: number) => {
      updateVars(vars.filter((_, i) => i !== index));
    },
    [vars, updateVars]
  );

  const updateCondition = useCallback(
    (index: number, field: 0 | 1 | 2, val: string) => {
      const newVars = [...vars];
      newVars[index] = [...newVars[index]] as VarTuple;
      newVars[index][field] = val;
      updateVars(newVars);
    },
    [vars, updateVars]
  );

  return (
    <InputWrapper
      label="Vars"
      description="Request matching conditions (variable, operator, value)"
      error={fieldState.error?.message}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {vars.map((v, i) => (
          <Space key={i} style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Select
              showSearch
              allowClear
              placeholder="Variable"
              value={v[0] || undefined}
              onChange={(val) => updateCondition(i, 0, val || '')}
              options={VARIABLE_OPTIONS}
              style={{ minWidth: 180 }}
            />
            <Select
              placeholder="Op"
              value={v[1] || undefined}
              onChange={(val) => updateCondition(i, 1, val || '')}
              options={OPERATORS.map((op) => ({ value: op, label: op }))}
              style={{ minWidth: 80 }}
            />
            <Input
              placeholder="Value"
              value={v[2]}
              onChange={(e) => updateCondition(i, 2, e.target.value)}
            />
            <Button
              type="text"
              danger
              icon={<IconDelete />}
              onClick={() => removeCondition(i)}
            />
          </Space>
        ))}
        <Button
          type="dashed"
          icon={<IconAdd />}
          onClick={addCondition}
          style={{ color: token.colorTextSecondary }}
        >
          Add Condition
        </Button>
      </div>
    </InputWrapper>
  );
};
