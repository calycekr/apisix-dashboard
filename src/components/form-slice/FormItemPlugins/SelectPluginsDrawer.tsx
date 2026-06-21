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
import { Button, Drawer, Typography } from 'antd';
import { useState } from 'react';

import IconAdd from '~icons/material-symbols/add';

import {
  PluginCardList,
  type PluginCardListProps,
  PluginCardListSearch,
} from './PluginCardList';
import { type PluginEditorDrawerProps } from './PluginEditorDrawer';

export type SelectPluginsDrawerProps = Pick<PluginCardListProps, 'plugins' | 'descriptions'> &
  Pick<PluginEditorDrawerProps, 'schema'> & {
    onAdd: (name: string) => void;
    opened: boolean;
    setOpened: (open: boolean) => void;
    disabled?: boolean;
    /** Count of plugins already configured on this resource */
    selectedCount?: number;
  };

/**
 * Because Drawer.Stack order is controlled by the parent, disabled hides the opener.
 */
export const SelectPluginsDrawer = (props: SelectPluginsDrawerProps) => {
  const {
    plugins,
    descriptions,
    onAdd,
    opened,
    setOpened,
    disabled = false,
    selectedCount = 0,
  } = props;
  const [search, setSearch] = useState('');
  const summaryText = selectedCount > 0
    ? `${selectedCount} configured / ${plugins.length} available to add`
    : `${plugins.length} plugins available in this APISIX instance`;

  return (
    <>
      <Drawer
        placement="right"
        styles={{
          wrapper: { width: 760, maxWidth: '100vw' },
          body: {
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          },
        }}
        keyboard={false}
        open={opened}
        onClose={() => {
          setOpened(false);
          setSearch('');
        }}
        title="Add Plugin"
      >
        <div className="plugin-picker-summary">
          <Typography.Text type="secondary">{summaryText}</Typography.Text>
        </div>
        <div className="plugin-picker-search">
          <PluginCardListSearch
            placeholder="Search by name, capability, or description"
            search={search}
            setSearch={setSearch}
          />
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <PluginCardList
            mode="add"
            fillAvailable
            search={search}
            onAdd={onAdd}
            plugins={plugins}
            descriptions={descriptions}
            showResultCount
          />
        </div>
      </Drawer>
      {!disabled && (
        <Button
          disabled={plugins.length === 0}
          icon={<IconAdd />}
          onClick={() => setOpened(true)}
          type="primary"
        >
          {plugins.length === 0 ? 'All Plugins Added' : 'Add Plugin'}
        </Button>
      )}
    </>
  );
};
