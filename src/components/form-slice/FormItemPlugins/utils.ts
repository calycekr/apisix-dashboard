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

import { getPluginCatalogEntry } from './pluginCatalog';

export type PluginCategoryInfo = {
  name: string;
  color: string;
  icon: string;
};

/** Canonical category list. Used for filters in PluginCardList. */
export const PLUGIN_CATEGORIES: PluginCategoryInfo[] = [
  { name: 'All', color: 'default', icon: '' },
  { name: 'AI Gateway', color: 'geekblue', icon: '🤖' },
  { name: 'Authentication', color: 'blue', icon: '🔒' },
  { name: 'Security', color: 'volcano', icon: '🛡️' },
  { name: 'Traffic', color: 'cyan', icon: '⚡' },
  { name: 'Transformation', color: 'gold', icon: '🔄' },
  { name: 'Observability', color: 'purple', icon: '📊' },
  { name: 'Serverless', color: 'green', icon: '☁️' },
  { name: 'Custom', color: 'default', icon: '🧩' },
  { name: 'Others', color: 'default', icon: '📦' },
];

const getCategoryInfo = (name: string): PluginCategoryInfo =>
  PLUGIN_CATEGORIES.find((category) => category.name === name) ??
  { name: 'Custom', color: 'default', icon: '🧩' };

export const getPluginCategory = (name: string): PluginCategoryInfo => {
  const catalogCategory = getPluginCatalogEntry(name)?.category;
  if (catalogCategory) return getCategoryInfo(catalogCategory);

  return getCategoryInfo('Custom');
};
