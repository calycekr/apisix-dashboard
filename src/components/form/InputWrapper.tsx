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
import { theme,Typography } from 'antd';
import { forwardRef } from 'react';

import type { InputWrapperProps } from '@/types/input-wrapper';

/**
 * Replacement for @mantine/core InputWrapper.
 * Renders a label above children and an error message below.
 */
export const InputWrapper = forwardRef<HTMLDivElement, InputWrapperProps>(
  (props, ref) => {
    const { label, description, error, required, withAsterisk, children, className, style } =
      props;
    const showAsterisk = required || withAsterisk;
    const { token } = theme.useToken();
    return (
      <div ref={ref} className={className} style={{ marginBottom: 16, ...style }}>
        {label && (
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            {showAsterisk && (
              <span style={{ color: token.colorError, marginRight: 4 }}>*</span>
            )}
            <Typography.Text>{label}</Typography.Text>
          </div>
        )}
        {description && (
          <div style={{ marginBottom: 4, fontSize: 12, color: token.colorTextSecondary }}>
            {description}
          </div>
        )}
        {children}
        {error && (
          <div style={{ marginTop: 2 }}>
            <Typography.Text type="danger" style={{ fontSize: 12 }}>
              {error}
            </Typography.Text>
          </div>
        )}
      </div>
    );
  }
);

InputWrapper.displayName = 'InputWrapper';
