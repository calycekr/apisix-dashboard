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
import { useQuery } from '@tanstack/react-query';
import { Alert, Button } from 'antd';
import { toJS } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import { difference } from 'rambdax';
import { useEffect, useMemo } from 'react';
import {
  type FieldValues,
  useController,
  type UseControllerProps,
} from 'react-hook-form';
import { useDeepCompareEffect } from 'react-use';

import {
  getPluginsListWithSchemaQueryOptions,
  type NeedPluginSchema,
} from '@/apis/plugins';
import { InputWrapper } from '@/components/form/InputWrapper';
import { genControllerProps } from '@/components/form/util';
import type { InputWrapperProps } from '@/types/input-wrapper';
import type { APISIXType } from '@/types/schema/apisix';

import type { PluginCardProps } from './PluginCard';
import { PluginCardList, PluginCardListSearch } from './PluginCardList';
import { getPluginDescription, getPluginSearchText } from './pluginCatalog';
import { type PluginConfig, PluginEditorDrawer } from './PluginEditorDrawer';
import { SelectPluginsDrawer } from './SelectPluginsDrawer';

export type FormItemPluginsProps<T extends FieldValues> = InputWrapperProps &
  UseControllerProps<T> & {
    onChange?: (value: Record<string, unknown>) => void;
  } & Partial<NeedPluginSchema> &
  Partial<APISIXType['PluginsQuery']>;

export const FormItemPlugins = <T extends FieldValues>(
  props: FormItemPluginsProps<T>
) => {
  const {
    controllerProps,
    restProps: { schema = 'schema', subsystem, ...restProps },
  } = genControllerProps(props, {});
  const {
    field: { value: rawObject, onChange: fOnChange, name: fName, ...restField },
    fieldState,
  } = useController<T>(controllerProps);
  const isView = useMemo(() => restField.disabled, [restField.disabled]);

  const pluginsOb = useLocalObservable(() => ({
    __map: new Map<string, Record<string, unknown>>(),
    init(obj: Record<string, Record<string, unknown>> | undefined) {
      this.__map = new Map(Object.entries(obj ?? {}));
    },
    delete(name: string) {
      this.__map.delete(name);
      this.save();
    },
    allPluginNames: [] as string[],
    pluginSchemaObj: new Map<string, APISIXType['PluginSchema']>(),
    initPlugins(props: {
      names: string[];
      originObj: Record<string, Record<string, unknown>>;
    }) {
      const { names, originObj } = props;
      this.allPluginNames = names;
      this.pluginSchemaObj = new Map(Object.entries(originObj));
    },
    get selected() {
      return Array.from(this.__map.keys());
    },
    get unSelected() {
      return difference(this.allPluginNames, this.selected);
    },
    save() {
      const obj = Object.fromEntries(toJS(this.__map));
      fOnChange(obj);
    },
    update(config: PluginConfig) {
      const { name, config: pluginConfig } = config;
      this.__map.set(name, pluginConfig);
      this.save();
      this.setSelectPluginsOpened(false);
    },
    curPlugin: {} as PluginConfig,
    setCurPlugin(name: string) {
      this.curPlugin = {
        name,
        config: this.__map.get(name) ?? {},
      } as PluginConfig;
      this.setEditorOpened(true);
    },
    get curPluginSchema() {
      const d = this.pluginSchemaObj.get(this.curPlugin.name);
      if (!d) return {};
      return d[schema];
    },
    editorOpened: false,
    setEditorOpened(val: boolean) {
      this.editorOpened = val;
    },
    closeEditor() {
      this.setEditorOpened(false);
      this.curPlugin = {} as PluginConfig;
    },
    search: '',
    setSearch(val: string) {
      this.search = val;
    },
    mode: 'edit' as PluginCardProps['mode'],
    selectPluginsOpened: false,
    setSelectPluginsOpened(val: boolean) {
      this.selectPluginsOpened = val;
    },
    on(mode: PluginCardProps['mode'], name: string) {
      this.setCurPlugin(name);
      this.mode = mode;
    },
  }));

  const pluginsListReq = useQuery(
    getPluginsListWithSchemaQueryOptions({ schema, subsystem })
  );

  // init the selected plugins
  useEffect(() => {
    pluginsOb.init(rawObject);
  }, [pluginsOb, rawObject]);
  useDeepCompareEffect(() => {
    if (pluginsListReq.data) {
      pluginsOb.initPlugins(pluginsListReq.data);
    }
  }, [pluginsOb, pluginsListReq.data]);

  // Extract descriptions from plugin schemas (dynamic, from API)
  const pluginDescriptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const [name, schemaObj] of pluginsOb.pluginSchemaObj.entries()) {
      const s = schemaObj?.[schema];
      const schemaDescription =
        s && typeof s === 'object' && 'description' in s
          ? String((s as { description: string }).description)
          : undefined;
      const description = getPluginDescription(name, schemaDescription);
      if (description) map.set(name, description);
    }
    return map;
  }, [pluginsOb.pluginSchemaObj, schema]);

  const selectedPlugins = pluginsOb.selected;
  const unavailablePlugins = pluginsListReq.data
    ? selectedPlugins.filter((name) => !pluginsOb.pluginSchemaObj.has(name))
    : [];
  const selectedCount = selectedPlugins.length;
  const visibleSelectedCount = pluginsOb.search
    ? selectedPlugins.filter((name) =>
        getPluginSearchText(name, pluginDescriptions.get(name)).includes(
          pluginsOb.search.toLowerCase().trim()
        )
      ).length
    : selectedCount;

  return (
    <InputWrapper
      error={fieldState.error?.message}
      fieldPath={controllerProps.name}
      {...restProps}
    >
      <input name={fName} type="hidden" />
      <>
        {pluginsListReq.isError && (
          <Alert
            type="warning"
            showIcon
            message="Plugin catalog is temporarily unavailable"
            description="Existing plugin settings are preserved and can still be reviewed as JSON or removed. Adding plugins is disabled until the catalog can be loaded."
            action={
              <Button size="small" onClick={() => pluginsListReq.refetch()}>
                Retry
              </Button>
            }
            style={{ marginBottom: 12 }}
          />
        )}
        {unavailablePlugins.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="Some configured plugins are not available in this APISIX instance"
            description={`${unavailablePlugins.join(', ')}. Their stored configuration remains intact. Review it in JSON mode or remove the plugin before saving if APISIX no longer supports it.`}
            style={{ marginBottom: 12 }}
          />
        )}
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ color: 'var(--ant-color-text-secondary)' }}>
              Selected plugins
            </span>
            <span
              style={{
                background: selectedCount > 0
                  ? 'var(--ant-blue-1)'
                  : 'var(--ant-color-fill-secondary)',
                border: '1px solid var(--ant-color-border-secondary)',
                borderRadius: 4,
                color: selectedCount > 0
                  ? 'var(--ant-blue-7)'
                  : 'var(--ant-color-text-secondary)',
                fontSize: 12,
                lineHeight: 1.4,
                padding: '0 7px',
              }}
            >
              {selectedCount}
            </span>
            {pluginsOb.search && (
              <span style={{ color: 'var(--ant-color-text-secondary)' }}>
                Showing {visibleSelectedCount} match{visibleSelectedCount === 1 ? '' : 'es'}
              </span>
            )}
          </div>
          <span style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
            {pluginsOb.unSelected.length} available to add
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <PluginCardListSearch
            placeholder="Search selected plugins"
            search={pluginsOb.search}
            setSearch={pluginsOb.setSearch}
          />
          <SelectPluginsDrawer
            plugins={pluginsOb.unSelected}
            descriptions={pluginDescriptions}
            opened={pluginsOb.selectPluginsOpened}
            setOpened={pluginsOb.setSelectPluginsOpened}
            onAdd={(name) => pluginsOb.on('add', name)}
            disabled={
              restField.disabled ||
              pluginsListReq.isError ||
              pluginsListReq.isPending
            }
          />
        </div>
        <PluginCardList
          mode={isView ? 'view' : 'edit'}
          placeholder="Search for Selected Plugins"
          mah="60vh"
          search={pluginsOb.search}
          plugins={pluginsOb.selected}
          descriptions={pluginDescriptions}
          configs={pluginsOb.__map}
          onDelete={pluginsOb.delete}
          onView={(name) => pluginsOb.on('view', name)}
          onEdit={(name) => pluginsOb.on('edit', name)}
        />
        <PluginEditorDrawer
          mode={isView ? 'view' : pluginsOb.mode}
          schema={toJS(pluginsOb.curPluginSchema)}
          opened={pluginsOb.editorOpened}
          onClose={pluginsOb.closeEditor}
          plugin={toJS(pluginsOb.curPlugin)}
          onSave={pluginsOb.update}
        />
      </>
    </InputWrapper>
  );
};
