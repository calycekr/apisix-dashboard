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
import { Button, Empty, Input, Typography } from 'antd';
import { useLocalObservable } from 'mobx-react-lite';
import { type ReactNode, useEffect } from 'react';

import IconSearch from '~icons/material-symbols/search';

import { PluginCard, type PluginCardProps } from './PluginCard';
import { getPluginSearchText } from './pluginCatalog';
import { getPluginCategory, PLUGIN_CATEGORIES } from './utils';

type PluginCardListSearchProps = {
  placeholder?: string;
  search: string;
  setSearch: (search: string) => void;
};
export const PluginCardListSearch = (props: PluginCardListSearchProps) => {
  const { placeholder, search, setSearch } = props;
  return (
    <Input
      allowClear
      className="plugin-list-search"
      placeholder={placeholder || 'Search'}
      prefix={<IconSearch />}
      value={search}
      style={{ flex: '1 1 260px', minWidth: 220, width: '100%' }}
      onChange={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setSearch(event.currentTarget.value);
      }}
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
  emptyDescription?: ReactNode;
  compactEmpty?: boolean;
  fillAvailable?: boolean;
  showResultCount?: boolean;
};

export const PluginCardList = (props: PluginCardListProps) => {
  const {
    search = '',
    cols,
    h,
    mah,
    plugins,
    descriptions,
    configs,
    emptyDescription,
    compactEmpty = false,
    fillAvailable = false,
    showResultCount = false,
  } = props;
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
    ...(fillAvailable && { flex: 1, minHeight: 0 }),
    overflowY: 'auto',
    ...(h !== undefined && { height: h }),
    ...(mah !== undefined && { maxHeight: mah }),
  };

  return (
    <div
      style={{
        ...(fillAvailable && {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
        }),
        marginTop: fillAvailable ? 12 : '1em',
      }}
    >
      {mode === 'add' && (
        <div
          aria-label="Plugin categories"
          className="plugin-category-filter"
          role="toolbar"
        >
          {PLUGIN_CATEGORIES.map(({ name, icon }) => {
            const active = optionsOb.category === name;
            return (
              <Button
                key={name}
                aria-pressed={active}
                className={active ? 'plugin-category-filter-active' : undefined}
                onClick={() => optionsOb.setCategory(name)}
                size="small"
                type={active ? 'primary' : 'text'}
              >
                {icon ? `${icon} ${name}` : name}
              </Button>
            );
          })}
        </div>
      )}
      {showResultCount && (() => {
        const count = optionsOb.list.length;
        const parts: string[] = [];
        if (optionsOb.search) parts.push(`"${optionsOb.search}"`);
        if (optionsOb.category !== 'All') parts.push(optionsOb.category);
        const qualifier = parts.length > 0 ? ` matching ${parts.join(' in ')}` : '';
        return (
          <Typography.Text
            type="secondary"
            className="plugin-list-result-count"
          >
            {count} plugin{count === 1 ? '' : 's'}{qualifier}
          </Typography.Text>
        );
      })()}
      <div style={scrollStyle}>
        {!optionsOb.list.length ? (
          <Empty
            className={compactEmpty ? 'plugin-list-empty-compact' : undefined}
            description={
              plugins.length === 0
                ? emptyDescription ?? 'No plugins selected'
                : 'No plugins match your search'
            }
            image={compactEmpty ? Empty.PRESENTED_IMAGE_SIMPLE : undefined}
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
};
