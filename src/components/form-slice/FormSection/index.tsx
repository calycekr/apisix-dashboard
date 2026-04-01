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
import { Anchor, Card, theme } from 'antd';
import { clsx } from 'clsx';
import { debounce } from 'rambdax';
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { APPSHELL_HEADER_HEIGHT } from '@/config/constant';
import { useShallowEffect } from '@/utils/hooks';

import classes from './style.module.css';

const SectionDepthCtx = createContext<number>(0);

const SectionDepthProvider = SectionDepthCtx.Provider;

// `form-section` class is for TOC scroll-spy
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
  const { className, legend, extra, children, disabled, ...restProps } = props;
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

  // refresh TOC when children changes
  useShallowEffect(refreshTOC, [children]);

  if (depth === 1) {
    return (
      <SectionDepthProvider value={depth}>
        <Card
          size="small"
          title={<LegendGroup legend={legend} extra={extra} />}
          className={clsx(tocSelector, classes.root, className)}
          style={{ marginBottom: 16 }}
          {...dataAttrs}
          {...(restProps as React.HTMLAttributes<HTMLDivElement>)}
        >
          <fieldset disabled={disabled} style={{ border: 'none', padding: 0, margin: 0 }}>
            {children}
          </fieldset>
        </Card>
      </SectionDepthProvider>
    );
  }

  return (
    <SectionDepthProvider value={depth}>
      <div
        className={clsx(tocSelector, classes.root, className)}
        style={{ paddingInlineStart: 16, marginBottom: 12 }}
        {...dataAttrs}
        {...(restProps as React.HTMLAttributes<HTMLDivElement>)}
      >
        {(legend || extra) && (
          <div style={{ marginBottom: 8, color: token.colorTextSecondary, fontWeight: 500, fontSize: token.fontSizeSM }}>
            <LegendGroup legend={legend} extra={extra} />
          </div>
        )}
        <fieldset disabled={disabled} style={{ border: 'none', padding: 0, margin: 0 }}>
          {children}
        </fieldset>
      </div>
    </SectionDepthProvider>
  );
};

type TOCItem = {
  key: string;
  href: string;
  title: string;
  depth: number;
};

const buildTOCItems = (): TOCItem[] => {
  const elements = document.querySelectorAll<HTMLElement>(`.${tocSelector}`);
  const items: TOCItem[] = [];
  elements.forEach((el) => {
    const label = el.getAttribute(tocValue);
    const depth = Number(el.getAttribute(tocDepth)) || 1;
    if (!label) return;
    // generate an id for scrolling if not present
    if (!el.id) {
      el.id = `toc-${label.replace(/\s+/g, '-').toLowerCase()}-${depth}`;
    }
    items.push({
      key: el.id,
      href: `#${el.id}`,
      title: label,
      depth,
    });
  });
  return items;
};

export type FormTOCBoxProps = PropsWithChildren;

export const FormTOCBox = (props: FormTOCBoxProps) => {
  const { children } = props;
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);

  const refreshTOC = useCallback(
    () => debounce(() => setTocItems(buildTOCItems()), 200),
    []
  );

  // build TOC after initial render
  useEffect(() => {
    setTocItems(buildTOCItems());
  }, []);

  return (
    <FormTOCCtx.Provider value={{ refreshTOC }}>
      <div
        style={{
          display: 'flex',
          gap: 30,
          paddingInlineEnd: '10%',
          position: 'relative',
          flexWrap: 'nowrap',
          alignItems: 'flex-start',
        }}
      >
        <Anchor
          items={tocItems.map((item) => ({
            key: item.key,
            href: item.href,
            title: item.title,
          }))}
          style={{
            flexShrink: 0,
            position: 'sticky',
            top: APPSHELL_HEADER_HEIGHT + 20,
            width: 200,
            marginTop: 10,
          }}
        />
        <div style={{ width: '80%' }}>
          {children}
        </div>
      </div>
    </FormTOCCtx.Provider>
  );
};
