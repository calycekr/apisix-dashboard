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
import type { PasswordProps } from 'antd/es/input';
import type { ReactNode } from 'react';
import {
  type FieldValues,
  useController,
  type UseControllerProps,
} from 'react-hook-form';

import { InputWrapper } from './InputWrapper';
import { genControllerProps } from './util';

export type FormItemPasswordInputProps<T extends FieldValues> =
  UseControllerProps<T> & PasswordProps & {
    label?: ReactNode;
    description?: ReactNode;
  };

/**
 * Form field component for sensitive data (passwords, tokens, keys).
 * Renders input with masked characters by default with an option to reveal.
 */
export const FormItemPasswordInput = <T extends FieldValues>(
  props: FormItemPasswordInputProps<T>
) => {
  const { controllerProps, restProps } = genControllerProps(props, '');
  const { label, description, ...inputProps } = restProps;
  const {
    field: { value, onChange: fOnChange, ...restField },
    fieldState,
  } = useController<T>(controllerProps);
  return (
    <InputWrapper
      label={label}
      description={description}
      error={fieldState.error?.message}
      required={!!controllerProps.rules?.required}
    >
      <Input.Password
        value={value}
        status={fieldState.error ? 'error' : undefined}
        onChange={(e) => {
          fOnChange(e);
          inputProps.onChange?.(e);
        }}
        {...restField}
        {...inputProps}
      />
    </InputWrapper>
  );
};
