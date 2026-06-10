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

import {
  getResolvedSchema,
  getSchemaProperties,
  type JSONSchema,
} from './schemaValidation';

const MULTILINE_FIELD_PATTERN =
  /(?:^|_)(?:body|metadata|spec|schema|template|script|certificate|cert|private_key|public_key|service_account_json)(?:$|_)/i;
const SECRET_FIELD_PATTERN =
  /(?:^|_)(?:password|passwd|secret|secret_key|private_key|access_token|api_key|token)(?:$|_)/i;

export type SchemaControlKind =
  | 'select'
  | 'multi-select'
  | 'tags'
  | 'number'
  | 'boolean'
  | 'password'
  | 'textarea'
  | 'url'
  | 'email'
  | 'text'
  | 'json'
  | 'object-array'
  | 'scalar-array'
  | 'union'
  | 'object';

const schemaType = (schema: JSONSchema): string | undefined =>
  Array.isArray(schema.type)
    ? schema.type[0]
    : schema.type ??
      (schema.properties ? 'object' : schema.items ? 'array' : undefined);

export const getSchemaControlKind = (
  fieldKey: string,
  schema: JSONSchema,
  rootSchema = schema
): SchemaControlKind => {
  const resolvedSchema = getResolvedSchema(schema, rootSchema);
  const effectiveType = schemaType(resolvedSchema);
  const properties = getSchemaProperties(resolvedSchema, rootSchema);
  const hasObjectShape =
    effectiveType === 'object' || Object.keys(properties).length > 0;
  const hasDynamicPatternProperties = Object.keys(
    resolvedSchema.patternProperties ?? {}
  ).some((pattern) => !/^[a-zA-Z0-9_.-]+$/.test(pattern));
  const unionVariants = resolvedSchema.oneOf || resolvedSchema.anyOf;
  const hasSelectableUnion = unionVariants?.some(
    (variant) =>
      variant.type !== undefined ||
      variant.enum !== undefined ||
      'const' in variant ||
      Object.keys(getSchemaProperties(variant, rootSchema)).length > 0
  );

  if (unionVariants && hasSelectableUnion && !hasObjectShape) return 'union';
  if (
    effectiveType === 'object' &&
    (hasDynamicPatternProperties ||
      resolvedSchema.additionalProperties === true ||
      typeof resolvedSchema.additionalProperties === 'object' ||
      Object.keys(properties).length === 0)
  ) {
    return 'json';
  }
  if (hasObjectShape) return 'object';
  if (effectiveType === 'array') {
    const itemSchema = resolvedSchema.items
      ? getResolvedSchema(resolvedSchema.items, rootSchema)
      : {};
    const itemType = schemaType(itemSchema);
    if (
      itemType === 'object' ||
      Object.keys(getSchemaProperties(itemSchema, rootSchema)).length > 0
    ) {
      return 'object-array';
    }
    if (
      itemType === 'number' ||
      itemType === 'integer' ||
      itemType === 'boolean'
    ) {
      return 'scalar-array';
    }
    if (itemType === 'array' || itemType === 'object') return 'json';
    return itemSchema.enum ? 'multi-select' : 'tags';
  }
  if (resolvedSchema.enum) return 'select';
  if (effectiveType === 'number' || effectiveType === 'integer') return 'number';
  if (effectiveType === 'boolean') return 'boolean';
  if (SECRET_FIELD_PATTERN.test(fieldKey)) return 'password';
  if (resolvedSchema.format === 'uri' || resolvedSchema.format === 'uri-reference') {
    return 'url';
  }
  if (resolvedSchema.format === 'email') return 'email';
  if (
    MULTILINE_FIELD_PATTERN.test(fieldKey) ||
    (resolvedSchema.maxLength !== undefined && resolvedSchema.maxLength > 200)
  ) {
    return 'textarea';
  }
  return 'text';
};
