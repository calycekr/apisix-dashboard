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
  getActiveRequiredFields,
  getResolvedSchema,
  getSchemaProperties,
  type JSONSchema,
  schemaType,
  validateSchemaValue,
} from './schemaValidation';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const cloneSchemaValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(cloneSchemaValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        cloneSchemaValue(nestedValue),
      ])
    );
  }
  return value;
};

const isSchemaValueCompatible = (
  schema: JSONSchema,
  value: unknown
): boolean => {
  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];
  if (types.length === 0) return true;
  return types.some((type) => {
    if (type === 'null') return value === null;
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') {
      return !!value && typeof value === 'object' && !Array.isArray(value);
    }
    if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
    if (type === 'number') return typeof value === 'number';
    return typeof value === type;
  });
};

const hasSchemaProperties = (schema: JSONSchema): boolean =>
  Object.keys(schema.properties ?? {}).length > 0;

export const applyJsonSchemaDefaults = (
  schema: object | undefined,
  config: Record<string, unknown> | undefined,
  rootSchema?: JSONSchema
): Record<string, unknown> => {
  const base = isRecord(config) ? { ...config } : {};
  if (!schema || !isRecord(schema)) return base;
  const typedSchema = schema as JSONSchema;
  const root = rootSchema ?? typedSchema;

  for (const [key, propSchema] of Object.entries(typedSchema.properties ?? {})) {
    if (!isRecord(propSchema)) continue;
    const resolvedPropSchema = getResolvedSchema(propSchema, root);
    if (
      base[key] === undefined &&
      'default' in resolvedPropSchema &&
      isSchemaValueCompatible(resolvedPropSchema, resolvedPropSchema.default)
    ) {
      base[key] = cloneSchemaValue(resolvedPropSchema.default);
    }
  }

  const properties = getSchemaProperties(typedSchema, root, base);
  for (const [key, rawPropSchema] of Object.entries(properties)) {
    const propSchema = getResolvedSchema(rawPropSchema, root);
    if (isRecord(base[key]) && hasSchemaProperties(propSchema)) {
      base[key] = applyJsonSchemaDefaults(
        propSchema,
        base[key] as Record<string, unknown>,
        root
      );
    }
    if (
      base[key] === undefined &&
      'default' in propSchema &&
      isSchemaValueCompatible(propSchema, propSchema.default)
    ) {
      base[key] = cloneSchemaValue(propSchema.default);
    }
  }

  return base;
};

const collectTemplateRequiredFields = (
  schema: JSONSchema,
  value: Record<string, unknown>,
  rootSchema: JSONSchema,
  required: Set<string>
) => {
  const resolvedSchema = getResolvedSchema(schema, rootSchema);

  const matchingVariants = [
    ...(resolvedSchema.oneOf ?? []),
    ...(resolvedSchema.anyOf ?? []),
  ].filter(
    (variant) => validateSchemaValue(variant, value, '', rootSchema).length === 0
  );
  const unionVariants = [
    ...(resolvedSchema.oneOf ?? []),
    ...(resolvedSchema.anyOf ?? []),
  ];
  if (matchingVariants.length === 0 && unionVariants[0]) {
    for (const key of getActiveRequiredFields(unionVariants[0], value, rootSchema)) {
      required.add(key);
    }
    collectTemplateRequiredFields(unionVariants[0], value, rootSchema, required);
  }

  for (const variant of resolvedSchema.allOf ?? []) {
    collectTemplateRequiredFields(variant, value, rootSchema, required);
  }
};

export const placeholderForJsonSchema = (
  schema: JSONSchema,
  rootSchema: JSONSchema
): unknown => {
  const resolvedSchema = getResolvedSchema(schema, rootSchema);

  if (
    'default' in resolvedSchema &&
    isSchemaValueCompatible(resolvedSchema, resolvedSchema.default)
  ) {
    return cloneSchemaValue(resolvedSchema.default);
  }
  if ('const' in resolvedSchema) return cloneSchemaValue(resolvedSchema.const);
  if (resolvedSchema.enum?.length) return cloneSchemaValue(resolvedSchema.enum[0]);

  const firstVariant = resolvedSchema.oneOf?.[0] ?? resolvedSchema.anyOf?.[0];
  if (!schemaType(resolvedSchema) && firstVariant) {
    return placeholderForJsonSchema(firstVariant, rootSchema);
  }

  const type = schemaType(resolvedSchema);
  if (type === 'object' || hasSchemaProperties(resolvedSchema)) {
    return buildJsonSchemaTemplate(resolvedSchema, {}, rootSchema);
  }
  if (type === 'array') {
    if (resolvedSchema.minItems && resolvedSchema.minItems > 0 && resolvedSchema.items) {
      return [placeholderForJsonSchema(resolvedSchema.items, rootSchema)];
    }
    return [];
  }
  if (type === 'integer') {
    return resolvedSchema.minimum ?? (
      resolvedSchema.exclusiveMinimum !== undefined
        ? Math.floor(resolvedSchema.exclusiveMinimum) + 1
        : 0
    );
  }
  if (type === 'number') {
    return resolvedSchema.minimum ?? (
      resolvedSchema.exclusiveMinimum !== undefined
        ? resolvedSchema.exclusiveMinimum + 1
        : 0
    );
  }
  if (type === 'boolean') return false;
  if (type === 'null') return null;
  if (resolvedSchema.format === 'uri' || resolvedSchema.format === 'uri-reference') {
    return 'https://example.com';
  }
  if (resolvedSchema.format === 'hostname') return 'example.com';
  if (resolvedSchema.format === 'ipv4') return '127.0.0.1';
  if (resolvedSchema.format === 'ipv6') return '::1';
  if (resolvedSchema.format === 'email') return 'user@example.com';
  if (resolvedSchema.format === 'date-time') return '2026-01-01T00:00:00Z';
  if (type === 'string' && resolvedSchema.minLength && resolvedSchema.minLength > 0) {
    return 'value';
  }
  return '';
};

export const buildJsonSchemaTemplate = (
  schema: object | undefined,
  config: Record<string, unknown> | undefined = {},
  rootSchema?: JSONSchema
): Record<string, unknown> => {
  const base = applyJsonSchemaDefaults(schema, config, rootSchema);
  if (!schema || !isRecord(schema)) return base;

  const sourceSchema = schema as JSONSchema;
  const root = rootSchema ?? sourceSchema;
  const typedSchema = getResolvedSchema(sourceSchema, root);
  const properties = getSchemaProperties(typedSchema, root, base);
  const required = new Set([
    ...(typedSchema.required ?? []),
    ...getActiveRequiredFields(typedSchema, base, root),
  ]);
  collectTemplateRequiredFields(typedSchema, base, root, required);

  for (const key of required) {
    if (base[key] !== undefined) continue;
    const propSchema = properties[key] ?? typedSchema.properties?.[key];
    base[key] = propSchema ? placeholderForJsonSchema(propSchema, root) : '';
  }

  for (const [key, value] of Object.entries(base)) {
    const propSchema = properties[key] ?? typedSchema.properties?.[key];
    if (isRecord(value) && propSchema) {
      const resolvedPropSchema = getResolvedSchema(propSchema, root);
      if (hasSchemaProperties(resolvedPropSchema)) {
        base[key] = buildJsonSchemaTemplate(resolvedPropSchema, value, root);
      }
    }
  }

  return base;
};
