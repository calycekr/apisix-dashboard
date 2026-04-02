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
import { EditableProTable, type ProColumns } from '@ant-design/pro-components';
import { Button } from 'antd';
import { toJS } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import { nanoid } from 'nanoid';
import { equals, isNil } from 'rambdax';
import { useEffect, useMemo } from 'react';
import {
  type FieldValues,
  useController,
  type UseControllerProps,
} from 'react-hook-form';
import type { ZodObject, ZodRawShape } from 'zod';

import { InputWrapper } from '@/components/form/InputWrapper';
import { AntdConfigProvider } from '@/config/antdConfigProvider';
import type { InputWrapperProps } from '@/types/input-wrapper';
import { APISIX, type APISIXType } from '@/types/schema/apisix';
import { useClickOutside } from '@/utils/hooks';
import { zGetDefault } from '@/utils/zod';

import { genControllerProps } from '../../form/util';

type DataSource = APISIXType['UpstreamNode'] & APISIXType['ID'];

const zValidateField = <T extends ZodRawShape, R extends keyof T>(
  zObj: ZodObject<T>,
  field: R,
  value: unknown
) => {
  const fieldSchema = zObj.shape[field];
  const res = fieldSchema.safeParse(value);
  if (res.success) {
    return Promise.resolve();
  }
  const error = res.error.issues[0];
  return Promise.reject(new Error(error.message));
};

const genRecord = (data?: DataSource | APISIXType['UpstreamNode']) => {
  const d = data || zGetDefault(APISIX.UpstreamNode);
  return {
    id: nanoid(),
    ...d,
  } as DataSource;
};

const objToUpstreamNodes = (data: APISIXType['UpstreamNodeObj']) => {
  return Object.entries(data).map(([key, val]) => {
    const [host, port] = key.split(':');
    const d: APISIXType['UpstreamNode'] = {
      host,
      port: Number(port) || 1,
      weight: val,
      priority: 0,
    };
    return d;
  });
};

const parseToDataSource = (data: APISIXType['UpstreamNodeListOrObj']) => {
  let val: APISIXType['UpstreamNodes'];
  if (isNil(data)) val = [];
  else if (Array.isArray(data)) val = data as APISIXType['UpstreamNodes'];
  else val = objToUpstreamNodes(data as APISIXType['UpstreamNodeObj']);
  return val.map(genRecord);
};

const parseToUpstreamNodes = (data: DataSource[] | undefined) => {
  if (!data?.length) return [];
  return data.map((item) => {
    const d: APISIXType['UpstreamNode'] = {
      host: item.host,
      port: item.port,
      weight: item.weight,
      priority: item.priority,
    };
    return d;
  });
};

const genProps = (field: keyof APISIXType['UpstreamNode']) => {
  return {
    rules: [
      {
        validator: (_: unknown, value: unknown) =>
          zValidateField(APISIX.UpstreamNode, field, value),
      },
    ],
  };
};

export type FormItemNodesProps<T extends FieldValues> =
  UseControllerProps<T> & {
    onChange?: (value: APISIXType['UpstreamNode'][]) => void;
    defaultValue?: APISIXType['UpstreamNode'][];
  } & Pick<InputWrapperProps, 'label' | 'required' | 'withAsterisk'>;

export const FormItemNodes = <T extends FieldValues>(
  props: FormItemNodesProps<T>
) => {
  const { controllerProps, restProps } = useMemo(
    () => genControllerProps(props),
    [props]
  );
  const {
    field: { value, onChange: fOnChange, name: fName, disabled },
    fieldState,
  } = useController<T>(controllerProps);
  const columns = useMemo<ProColumns<DataSource>[]>(
    () => [
      {
        title: 'id',
        dataIndex: 'id',
        hidden: true,
      },
      {
        title: 'Host',
        dataIndex: 'host',
        valueType: 'text',
        formItemProps: genProps('host'),
      },
      {
        title: 'Port',
        dataIndex: 'port',
        valueType: 'digit',
        formItemProps: genProps('port'),
        render: (_, entity) => {
          return entity.port.toString();
        },
      },
      {
        title: 'Weight',
        dataIndex: 'weight',
        valueType: 'digit',
        formItemProps: genProps('weight'),
        render: (_, entity) => {
          return entity.weight.toString();
        },
      },
      {
        title: 'Priority',
        dataIndex: 'priority',
        valueType: 'digit',
        formItemProps: genProps('priority'),
        render: (_, entity) => {
          return entity.priority?.toString() || '-';
        },
      },
      {
        title: 'Action',
        valueType: 'option',
        width: 100,
        hidden: disabled,
        render: () => null,
      },
    ],
    [disabled]
  );
  const { label, required, withAsterisk } = props;
  const ob = useLocalObservable(() => ({
    disabled: false,
    setDisabled(disabled: boolean | undefined) {
      this.disabled = disabled || false;
    },
    values: [] as DataSource[],
    setValues(data: DataSource[]) {
      if (equals(toJS(this.values), data)) return;
      this.values = data;
    },
    append(data: DataSource) {
      this.values.push(data);
    },
    remove(id: string) {
      const index = this.values.findIndex((item) => item.id === id);
      if (index === -1) return;
      this.values.splice(index, 1);
    },
    get editableKeys() {
      return this.disabled ? [] : this.values.map((item) => item.id);
    },
  }));
  useEffect(() => {
    ob.setValues(parseToDataSource(value));
  }, [ob, value]);
  useEffect(() => {
    ob.setDisabled(disabled);
  }, [disabled, ob]);

  const ref = useClickOutside<HTMLDivElement>(() => {
    const vals = parseToUpstreamNodes(toJS(ob.values));
    fOnChange?.(vals);
    restProps.onChange?.(vals);
  });

  return (
    <InputWrapper
      error={fieldState.error?.message}
      label={label}
      required={required}
      withAsterisk={withAsterisk}
      ref={ref}
    >
      <input name={fName} type="hidden" />
      <AntdConfigProvider>
        <EditableProTable<DataSource>
          defaultSize="small"
          rowKey="id"
          bordered
          controlled={false}
          value={ob.values}
          recordCreatorProps={false}
          columns={columns}
          editable={{
            type: 'multiple',
            editableKeys: ob.editableKeys,
            onValuesChange(_, dataSource) {
              ob.setValues(dataSource);
            },
            actionRender: (row) => {
              return [
                <Button
                  key="delete"
                  type="text"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => ob.remove(row.id)}
                >
                  Delete
                </Button>,
              ];
            },
          }}
        />
      </AntdConfigProvider>
      <Button
        style={{ marginTop: 8, width: '100%', borderColor: 'whitesmoke', ...(disabled && { display: 'none' }) }}
        size="small"
        onClick={() => ob.append(genRecord())}
      >
        Add a Node
      </Button>
    </InputWrapper>
  );
};
