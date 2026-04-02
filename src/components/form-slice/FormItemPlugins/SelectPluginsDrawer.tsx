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
import { Button, Drawer } from 'antd';
import { useState } from 'react';

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
  };
/**
 * because we need keep the drawer order when using the Drawer.Stack, so we pass disabled to the btn
 */
export const SelectPluginsDrawer = (props: SelectPluginsDrawerProps) => {
  const { plugins, descriptions, onAdd, opened, setOpened, disabled = false } = props;
  const [search, setSearch] = useState('');

  return (
    <>
      <Drawer
        placement="right"
        width={720}
        keyboard={false}
        open={opened}
        onClose={() => setOpened(false)}
        title="Select Plugins"
        extra={
          <div style={{ minHeight: 60 }}>
            <PluginCardListSearch search={search} setSearch={setSearch} />
          </div>
        }
      >
        <PluginCardList
          mode="add"
          cols={2}
          h="80vh"
          search={search}
          onAdd={onAdd}
          plugins={plugins}
          descriptions={descriptions}
        />
      </Drawer>
      {!disabled && (
        <Button style={{ marginLeft: 8 }} onClick={() => setOpened(true)}>
          Select Plugins
        </Button>
      )}
    </>
  );
};
