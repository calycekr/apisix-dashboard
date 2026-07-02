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
import { useMemo } from 'react';

import {
  getPluginMetadataListQueryOptions,
  getPluginsListWithSchemaQueryOptions,
} from '@/apis/plugins';
import type { PluginConfig } from '@/components/form-slice/FormItemPlugins/PluginEditorDrawer';
import { stripSystemReadonlyFields } from '@/utils/apisixEditable';

export type PluginInfo = PluginConfig & { schema: object };

// waiting apisix api to help handle the request
export const usePluginMetadataList = () => {
  const pluginsListQuery = useQuery(
    getPluginsListWithSchemaQueryOptions({ schema: 'metadata_schema' })
  );

  const metadataListQuery = useQuery(getPluginMetadataListQueryOptions());

  const { names = [], originObj = {} } = pluginsListQuery.data ?? {};

  const isLoading = pluginsListQuery.isPending || metadataListQuery.isPending;

  const { hasConfigNames, pluginInfoMap } = useMemo(() => {
    // Map configured plugin metadata items by their plugin name
    const configuredMetadataMap = new Map<string, Record<string, unknown>>();
    const configuredMetadataList = metadataListQuery.data?.list ?? [];
    for (const item of configuredMetadataList) {
      const pluginName = item.key.split('/').pop();
      if (pluginName) {
        configuredMetadataMap.set(pluginName, item.value);
      }
    }

    const nextHasConfigNames: string[] = [];
    const nextPluginInfoMap = new Map<string, PluginInfo>();

    for (const pluginName of names) {
      const hasConfig = configuredMetadataMap.has(pluginName);
      const configVal = configuredMetadataMap.get(pluginName) ?? {};
      const info = {
        name: pluginName,
        config: stripSystemReadonlyFields(configVal),
        schema:
          (originObj[pluginName]?.metadata_schema as object | undefined) ??
          (originObj[pluginName]?.schema as object | undefined) ??
          {},
      };
      nextPluginInfoMap.set(pluginName, info);
      if (hasConfig) {
        nextHasConfigNames.push(pluginName);
      }
    }

    return {
      hasConfigNames: nextHasConfigNames,
      pluginInfoMap: nextPluginInfoMap,
    };
  }, [metadataListQuery.data, names, originObj]);

  return {
    isLoading,
    isError: pluginsListQuery.isError || metadataListQuery.isError,
    error: pluginsListQuery.error || metadataListQuery.error,
    hasConfigNames,
    pluginInfoMap,
    allPluginNames: names,
    refetch: async () => {
      await Promise.all([
        pluginsListQuery.refetch({ throwOnError: true }),
        metadataListQuery.refetch({ throwOnError: true }),
      ]);
    },
  };
};
