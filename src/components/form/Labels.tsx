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
import { Select, type SelectProps } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import {
  type FieldValues,
  useController,
  type UseControllerProps,
} from 'react-hook-form';
import type { APISIXType } from '@/types/schema/apisix';

import { FormError } from './FormError';
import { genControllerProps } from './util';

export type FormItemLabels<T extends FieldValues> = UseControllerProps<T> &
  Omit<SelectProps, 'value' | 'onChange' | 'onBlur' | 'defaultValue' | 'mode'> & {
    onChange?: (value: APISIXType['Labels']) => void;
    defaultValue?: APISIXType['Labels'];
    label?: React.ReactNode;
    description?: React.ReactNode;
  };

export const FormItemLabels = <T extends FieldValues>(
  props: FormItemLabels<T>
) => {
  const { controllerProps, restProps: { onChange: propsOnChange, label: _label, description: _description, ...restProps } } = genControllerProps(props);
  const {
    field: { value, onChange: fOnChange, name: fName, onBlur: fOnBlur, ...restField },
    fieldState,
  } = useController<T>(controllerProps);
  const [internalError, setInternalError] = useState<string | null>();

  const values = useMemo(() => {
    if (!value) return [];
    return Object.entries(value).map(([key, val]) => `${key}:${val}`);
  }, [value]);

  const handleSearch = useCallback(
    (val: string) => {
      const tuple = val.split(':');
      // when clear input, val can be ''
      if (val && tuple.length !== 2) {
        setInternalError('The format of label is wrong, it should be `key:value`');
        return;
      }
      setInternalError(null);
    },
    []
  );

  const handleChange = useCallback(
    (vals: string[]) => {
      const obj: APISIXType['Labels'] = {};
      for (const val of vals) {
        const tuple = val.split(':');
        if (tuple.length !== 2) {
          setInternalError('The format of label is wrong, it should be `key:value`');
          return;
        }
        obj[tuple[0]] = tuple[1];
      }
      setInternalError(null);
      fOnChange(obj);
      propsOnChange?.(obj);
    },
    [fOnChange, propsOnChange]
  );

  return (
    <>
      <input name={fName} type="hidden" />
      <Select
        mode="tags"
        allowClear
        value={values}
        onSearch={handleSearch}
        tokenSeparators={[',']}
        placeholder="Input text like `key:value`, then enter or blur"
        status={internalError || fieldState.error ? 'error' : undefined}
        onChange={handleChange}
        onBlur={fOnBlur}
        {...restField}
        {...restProps}
      />
      <FormError message={internalError || fieldState.error?.message} />
    </>
  );
};
