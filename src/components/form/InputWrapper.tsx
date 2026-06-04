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
import { Tooltip } from 'antd';
import { clsx } from 'clsx';
import { forwardRef } from 'react';

import type { InputWrapperProps } from '@/types/input-wrapper';
import IconInfo from '~icons/material-symbols/info-outline';

import classes from './InputWrapper.module.css';

const SuccessIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      color: 'var(--ant-color-success)',
      marginLeft: 6,
      display: 'inline-flex',
      alignItems: 'center',
      verticalAlign: 'middle',
    }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Replacement for @mantine/core InputWrapper.
 * Renders a label above children and an error message below.
 */
export const InputWrapper = forwardRef<HTMLDivElement, InputWrapperProps>(
  (props, ref) => {
    const {
      label,
      description,
      tooltip,
      status,
      error,
      required,
      withAsterisk,
      children,
      className,
      fieldPath,
      style,
    } = props;
    const showAsterisk = required || withAsterisk;

    const isDescriptionLong = typeof description === 'string' && description.length > 60;
    const activeTooltip = tooltip || (isDescriptionLong ? description : undefined);
    const inlineDescription = isDescriptionLong ? undefined : description;

    const activeStatus = error ? 'error' : status;

    return (
      <div
        ref={ref}
        className={clsx(
          classes.root,
          activeStatus === 'error' && classes.rootError,
          activeStatus === 'success' && classes.rootSuccess,
          className
        )}
        data-form-field={fieldPath}
        style={style}
      >
        {label && (
          <div className={classes.labelRow}>
            {showAsterisk && (
              <span className={classes.asterisk}>*</span>
            )}
            <span>{label}</span>
            {activeTooltip && (
              <Tooltip title={activeTooltip}>
                <span className={classes.tooltipIcon}>
                  <IconInfo style={{ fontSize: 14 }} />
                </span>
              </Tooltip>
            )}
            {activeStatus === 'success' && <SuccessIcon />}
          </div>
        )}
        {inlineDescription && (
          <div className={classes.description}>
            {inlineDescription}
          </div>
        )}
        {children}
        {error && (
          <div className={classes.errorContainer}>
            <span className={classes.errorText}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ant-color-error)' }} />
              {error}
            </span>
          </div>
        )}
      </div>
    );
  }
);

InputWrapper.displayName = 'InputWrapper';
