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
import { z } from 'zod';

const Plugin = z.record(z.unknown());

const Plugins = z.record(Plugin);
const FreeObject = z.object({}).catchall(z.unknown());

const PluginsQuery = z.object({
  subsystem: z.union([z.literal('http'), z.literal('stream')]).optional(),
});

const PluginConsumerSchema = FreeObject;
const PluginMetadataSchema = FreeObject;

const PluginSchema = z.object({
  consumer_schema: PluginConsumerSchema.optional(),
  metadata_schema: PluginMetadataSchema.optional(),
  schema: FreeObject.optional(),
});

const PluginSchemaKeys = z.union([
  z.literal('schema'),
  z.literal('consumer_schema'),
  z.literal('metadata_schema'),
]);

export const APISIXPlugins = {
  Plugin,
  Plugins,
  PluginsQuery,
  PluginSchema,
  PluginSchemaKeys,
  PluginMetadataSchema,
};
