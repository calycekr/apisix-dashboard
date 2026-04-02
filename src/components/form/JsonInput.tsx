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
import { Input } from 'antd';
import type { TextAreaProps } from 'antd/es/input';
import { omit } from 'rambdax';
import { type ReactNode, useMemo } from 'react';
import {
  type FieldValues,
  useController,
  type UseControllerProps,
} from 'react-hook-form';

import { InputWrapper } from './InputWrapper';
import { genControllerProps } from './util';

export type FormItemJsonInputProps<T extends FieldValues> = UseControllerProps<T> &
  TextAreaProps & {
    toObject?: boolean;
    objValue?: unknown;
    label?: ReactNode;
    description?: ReactNode;
  };

export const FormItemJsonInput = <T extends FieldValues>(
  props: FormItemJsonInputProps<T>
) => {
  const { objValue = {} } = props;
  const {
    controllerProps,
    restProps: { toObject, label, description, ...restProps },
  } = genControllerProps(props, props.toObject ? objValue : '');
  const {
    field: { value: rawVal, onChange: fOnChange, onBlur: fOnBlur, ...restField },
    fieldState,
  } = useController<T>(controllerProps);
  const value = useMemo(() => {
    if (!toObject) return rawVal;
    if (typeof rawVal === 'string') return rawVal;
    const val = JSON.stringify(rawVal, null, 2);
    if (val === JSON.stringify(objValue)) return '';
    return val;
  }, [rawVal, toObject, objValue]);

  return (
    <InputWrapper
      label={label}
      description={description}
      error={fieldState.error?.message}
      required={!!controllerProps.rules?.required}
    >
      <Input.TextArea
        value={value}
        status={fieldState.error ? 'error' : undefined}
        onChange={(e) => {
          const val = e.target.value;
          let res: unknown;
          if (toObject) {
            try {
              res = JSON.parse(val);
            } catch {
              res = val.length === 0 ? objValue : val;
            }
          } else {
            res = val;
          }
          fOnChange(res);
          restProps.onChange?.(e);
        }}
        onBlur={(e) => {
          const val = e.target.value;
          try {
            const formatted = JSON.stringify(JSON.parse(val), null, 2);
            let res: unknown;
            if (toObject) {
              try {
                res = JSON.parse(formatted);
              } catch {
                res = formatted;
              }
            } else {
              res = formatted;
            }
            fOnChange(res);
          } catch {
            // not valid JSON, leave as-is
          }
          fOnBlur();
          restProps.onBlur?.(e);
        }}
        autoSize
        style={{ resize: 'vertical' }}
        {...restField}
        {...(omit(['objValue'], restProps) as TextAreaProps)}
      />
    </InputWrapper>
  );
};
