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
import { Button, Card, theme } from 'antd';
import { clsx } from 'clsx';
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

import { useShallowEffect } from '@/utils/hooks';
import IconExpandLess from '~icons/material-symbols/expand-less';
import IconExpandMore from '~icons/material-symbols/expand-more';

import classes from './style.module.css';

const SectionDepthCtx = createContext<number>(0);

const SectionDepthProvider = SectionDepthCtx.Provider;

const tocSelector = 'form-section';
const tocValue = 'data-label';
const tocDepth = 'data-depth';

const FormTOCCtx = createContext<{
  refreshTOC: () => void;
}>({
  refreshTOC: () => {},
});

export type FormSectionProps = PropsWithChildren & {
  legend?: ReactNode;
  extra?: ReactNode;
  disabled?: boolean;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

const LegendGroup = ({
  legend,
  extra,
}: {
  legend: ReactNode;
  extra?: ReactNode;
}) => {
  if (!legend && !extra) {
    return null;
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {legend}
      {extra}
    </div>
  );
};

export const FormSection = (props: FormSectionProps) => {
  const { className, legend, extra, children, disabled, collapsible, defaultOpen, ...restProps } = props;
  const parentDepth = useContext(SectionDepthCtx);
  const { refreshTOC } = useContext(FormTOCCtx);
  const depth = useMemo(() => parentDepth + 1, [parentDepth]);
  const { token } = theme.useToken();
  const dataAttrs = useMemo(
    () => ({
      [tocValue]: typeof legend === 'string' ? legend : undefined,
      [tocDepth]: depth,
    }),
    [legend, depth]
  );
  const [open, setOpen] = useState(defaultOpen ?? true);

  // refresh TOC when children changes
  useShallowEffect(refreshTOC, [children]);

  if (depth === 1) {
    return (
      <SectionDepthProvider value={depth}>
        <Card
          size="small"
          title={<LegendGroup legend={legend} extra={extra} />}
          extra={
            collapsible ? (
              <Button
                type="text"
                size="small"
                icon={open ? <IconExpandLess /> : <IconExpandMore />}
                onClick={() => setOpen(!open)}
              />
            ) : undefined
          }
          className={clsx(tocSelector, classes.root, className)}
          style={{ marginBottom: 16 }}
          {...dataAttrs}
          {...(restProps as React.HTMLAttributes<HTMLDivElement>)}
        >
          {open && (
            <fieldset disabled={disabled} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {children}
            </fieldset>
          )}
        </Card>
      </SectionDepthProvider>
    );
  }

  return (
    <SectionDepthProvider value={depth}>
      <div
        className={clsx(tocSelector, classes.root, className)}
        style={{ paddingInlineStart: 16, marginBottom: 16, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 }}
        {...dataAttrs}
        {...(restProps as React.HTMLAttributes<HTMLDivElement>)}
      >
        {(legend || extra) && (
          <div style={{ marginBottom: 8, color: token.colorTextSecondary, fontWeight: 500, fontSize: token.fontSizeSM }}>
            <LegendGroup legend={legend} extra={extra} />
          </div>
        )}
        <fieldset disabled={disabled} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {children}
        </fieldset>
      </div>
    </SectionDepthProvider>
  );
};

export type FormTOCBoxProps = PropsWithChildren;

export const FormTOCBox = (props: FormTOCBoxProps) => {
  const { children } = props;
  return (
    <FormTOCCtx.Provider value={{ refreshTOC: () => {} }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {children}
      </div>
    </FormTOCCtx.Provider>
  );
};
