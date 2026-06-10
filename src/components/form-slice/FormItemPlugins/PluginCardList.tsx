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
import { Empty, Input, Tabs, theme } from 'antd';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useEffect } from 'react';

import IconClose from '~icons/material-symbols/cancel';

import { PluginCard, type PluginCardProps } from './PluginCard';
import { getPluginSearchText } from './pluginCatalog';
import { getPluginCategory } from './utils';

type PluginCardListSearchProps = {
  placeholder?: string;
  search: string;
  setSearch: (search: string) => void;
};
export const PluginCardListSearch = (props: PluginCardListSearchProps) => {
  const { placeholder, search, setSearch } = props;
  const { token } = theme.useToken();
  return (
    <Input
      placeholder={placeholder || 'Search'}
      value={search}
      style={{ flexGrow: 1, position: 'sticky', top: 0 }}
      onChange={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setSearch(event.currentTarget.value);
      }}
      suffix={
        search ? (
          <IconClose
            onClick={(event: React.MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              setSearch('');
            }}
            style={{ cursor: 'pointer', color: token.colorTextQuaternary }}
          />
        ) : (
          <span />
        )
      }
    />
  );
};

type OptionProps = Pick<
  PluginCardProps,
  'onAdd' | 'onEdit' | 'onDelete' | 'onView' | 'mode'
> & {
  name: string;
};

export type PluginCardListProps = Omit<OptionProps, 'name'> & {
  placeholder?: string;
  cols?: number;
  h?: number | string;
  mah?: number | string;
  search: string;
  plugins: string[];
  /** Dynamic descriptions from API schema (overrides hardcoded) */
    descriptions?: Map<string, string>;
  /** Plugin configurations for displaying config summaries on cards */
  configs?: Map<string, object>;
};

export const PluginCardList = observer((props: PluginCardListProps) => {
  const { search = '', cols, h, mah, plugins, descriptions, configs } = props;
  const { mode, onAdd, onEdit, onDelete, onView } = props;

  const optionsOb = useLocalObservable(() => ({
    search: '',
    category: 'All',
    plugins: [] as string[],
    descriptions: new Map<string, string>(),
    mode: 'add' as PluginCardProps['mode'],
    setSearch(search: string) {
      this.search = search.toLowerCase().trim();
    },
    setCategory(category: string) {
      this.category = category;
    },
    setPlugins(plugins: string[]) {
      this.plugins = plugins;
    },
    setDescriptions(descriptions?: Map<string, string>) {
      this.descriptions = descriptions ?? new Map();
    },
    setMode(mode: PluginCardProps['mode']) {
      this.mode = mode;
    },
    get list() {
      let arr = !this.search
        ? this.plugins
        : this.plugins.filter((name) =>
            getPluginSearchText(name, this.descriptions.get(name)).includes(
              this.search
            )
          );
      if (this.mode === 'add' && this.category !== 'All') {
        arr = arr.filter((name) => {
          const cat = getPluginCategory(name);
          return cat.name === this.category;
        });
      }
      return arr;
    },
  }));

  useEffect(() => optionsOb.setPlugins(plugins), [optionsOb, plugins]);
  useEffect(
    () => optionsOb.setDescriptions(descriptions),
    [descriptions, optionsOb]
  );
  useEffect(() => optionsOb.setSearch(search), [optionsOb, search]);
  useEffect(() => optionsOb.setMode(mode), [optionsOb, mode]);

  const scrollStyle: React.CSSProperties = {
    overflowY: 'auto',
    ...(h !== undefined && { height: h }),
    ...(mah !== undefined && { maxHeight: mah }),
  };

  return (
    <div style={{ marginTop: '1em' }}>
      {mode === 'add' && (
        <Tabs
          activeKey={optionsOb.category}
          onChange={(key) => optionsOb.setCategory(key)}
          style={{ marginBottom: 12 }}
          className="marketplace-tabs"
          items={[
            { key: 'All', label: 'All' },
            { key: 'AI Gateway', label: 'AI Gateway' },
            { key: 'Authentication', label: '🔒 Auth' },
            { key: 'Security', label: '🛡️ Security' },
            { key: 'Traffic', label: '⚡ Traffic' },
            { key: 'Transformation', label: 'Transformation' },
            { key: 'Observability', label: '📊 Observability' },
            { key: 'Serverless', label: '☁️ Serverless' },
            { key: 'Others', label: '📦 Others' },
          ]}
        />
      )}
      <div style={scrollStyle}>
        {!optionsOb.list.length ? (
          <Empty
            description={
              plugins.length === 0
                ? 'No plugins selected'
                : 'No plugins match your search'
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: cols
                ? `repeat(${cols}, minmax(0, 1fr))`
                : 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 8,
            }}
          >
            {optionsOb.list.map((name) => (
              <PluginCard
                key={name}
                mode={optionsOb.mode}
                name={name}
                desc={descriptions?.get(name)}
                config={configs?.get(name)}
                onAdd={() => onAdd?.(name)}
                onEdit={() => onEdit?.(name)}
                onDelete={() => onDelete?.(name)}
                onView={() => onView?.(name)}
                search={optionsOb.search}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
