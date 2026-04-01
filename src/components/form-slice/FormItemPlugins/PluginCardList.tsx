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
import { Empty, Input, theme } from 'antd';
import IconClose from '~icons/material-symbols/cancel';
import { useLocalObservable } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { PluginCard, type PluginCardProps } from './PluginCard';

type PluginCardListSearchProps = {
  placeholder?: string;
  search: string;
  setSearch: (search: string) => void;
};
export const PluginCardListSearch = (props: PluginCardListSearchProps) => {
  const { placeholder, search, setSearch } = props;
  const { t } = useTranslation();
  const { token } = theme.useToken();
  return (
    <Input
      placeholder={placeholder || t('form.search')}
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
};

export const PluginCardList = (props: PluginCardListProps) => {
  const { search = '', cols = 3, h, mah, plugins } = props;
  const { mode, onAdd, onEdit, onDelete, onView } = props;
  const { t } = useTranslation();

  const optionsOb = useLocalObservable(() => ({
    search: '',
    plugins: [] as string[],
    mode: 'add' as PluginCardProps['mode'],
    setSearch(search: string) {
      this.search = search.toLowerCase().trim();
    },
    setPlugins(plugins: string[]) {
      this.plugins = plugins;
    },
    setMode(mode: PluginCardProps['mode']) {
      this.mode = mode;
    },
    get list() {
      const arr = !this.search
        ? this.plugins
        : this.plugins.filter((d) => d.toLowerCase().includes(this.search));
      return arr;
    },
  }));

  useEffect(() => optionsOb.setPlugins(plugins), [optionsOb, plugins]);
  useEffect(() => optionsOb.setSearch(search), [optionsOb, search]);
  useEffect(() => optionsOb.setMode(mode), [optionsOb, mode]);

  const scrollStyle: React.CSSProperties = {
    overflowY: 'auto',
    ...(h !== undefined && { height: h }),
    ...(mah !== undefined && { maxHeight: mah }),
  };

  return (
    <div style={{ marginTop: '1em' }}>
      <div style={scrollStyle}>
        {!optionsOb.list.length ? (
          <Empty description={t('noData')} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 8,
            }}
          >
            {optionsOb.list.map((name) => (
              <PluginCard
                key={name}
                mode={optionsOb.mode}
                name={name}
                onAdd={() => onAdd?.(name)}
                onEdit={() => onEdit?.(name)}
                onDelete={() => onDelete?.(name)}
                onView={() => onView?.(name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
