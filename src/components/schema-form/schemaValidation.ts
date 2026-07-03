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

export type JSONSchema = {
  $ref?: string;
  $defs?: Record<string, JSONSchema>;
  definitions?: Record<string, JSONSchema>;
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JSONSchema>;
  patternProperties?: Record<string, JSONSchema>;
  additionalProperties?: boolean | JSONSchema;
  items?: JSONSchema;
  required?: string[];
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  not?: JSONSchema;
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;
  dependencies?: Record<string, string[] | JSONSchema>;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const schemaTypes = (schema: JSONSchema): string[] => {
  if (Array.isArray(schema.type)) return schema.type;
  return schema.type ? [schema.type] : [];
};

/** Returns the effective single type string of a schema, inferring 'object' or 'array' from shape. */
export const schemaType = (schema: JSONSchema): string | undefined =>
  Array.isArray(schema.type)
    ? schema.type[0]
    : schema.type ??
      (schema.properties && Object.keys(schema.properties).length > 0
        ? 'object'
        : schema.items ? 'array' : undefined);

const matchesType = (value: unknown, type: string): boolean => {
  if (type === 'object') return isRecord(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  return true;
};

const valuesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const childPath = (path: string, key: string | number): string =>
  typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key;

const resolveLocalRef = (
  rootSchema: JSONSchema,
  ref: string | undefined
): JSONSchema | undefined => {
  if (!ref?.startsWith('#/')) return undefined;

  let current: unknown = rootSchema;
  for (const rawPart of ref.slice(2).split('/')) {
    const part = rawPart.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isRecord(current) || !(part in current)) return undefined;
    current = current[part];
  }

  return isRecord(current) ? current as JSONSchema : undefined;
};

export const getResolvedSchema = (
  schema: JSONSchema,
  rootSchema = schema,
  visitedRefs = new Set<string>()
): JSONSchema => {
  let resolved: JSONSchema = {};

  if (schema.$ref && !visitedRefs.has(schema.$ref)) {
    const referencedSchema = resolveLocalRef(rootSchema, schema.$ref);
    if (referencedSchema) {
      visitedRefs.add(schema.$ref);
      resolved = getResolvedSchema(referencedSchema, rootSchema, visitedRefs);
    }
  }

  for (const variant of schema.allOf ?? []) {
    const resolvedVariant = getResolvedSchema(
      variant,
      rootSchema,
      visitedRefs
    );
    resolved = {
      ...resolved,
      ...resolvedVariant,
      properties: {
        ...resolved.properties,
        ...resolvedVariant.properties,
      },
    };
  }

  return {
    ...resolved,
    ...schema,
    properties: {
      ...resolved.properties,
      ...schema.properties,
    },
  };
};

const matchesFormat = (value: string, format: string): boolean => {
  if (format === 'ipv4') {
    const parts = value.split('.');
    return parts.length === 4 && parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false;
      if (part.length > 1 && part.startsWith('0')) return false;
      const octet = Number(part);
      return octet >= 0 && octet <= 255;
    });
  }
  if (format === 'ipv6') {
    if (!value.includes(':') || !/^[0-9a-fA-F:.]+$/.test(value)) return false;
    try {
      return new URL(`http://[${value}]/`).hostname.length > 0;
    } catch {
      return false;
    }
  }
  if (format === 'uri' || format === 'uri-reference') {
    try {
      if (format === 'uri-reference') {
        new URL(value, 'http://localhost');
      } else {
        new URL(value);
      }
      return true;
    } catch {
      return false;
    }
  }
  if (format === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (format === 'hostname') {
    return value.length <= 253 && value.split('.').every(
      (part) =>
        part.length > 0 &&
        part.length <= 63 &&
        /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(part)
    );
  }
  if (format === 'date-time') {
    return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
  }
  return true;
};

const validate = (
  schema: JSONSchema | undefined,
  value: unknown,
  path: string,
  rootSchema: JSONSchema
): string[] => {
  if (!schema) return [];

  const label = path || 'config';
  const issues: string[] = [];
  const types = schemaTypes(schema);
  const referencedSchema = resolveLocalRef(rootSchema, schema.$ref);

  if (schema.$ref && !referencedSchema) {
    issues.push(`${label} references unsupported schema ${schema.$ref}.`);
  } else if (referencedSchema) {
    issues.push(...validate(referencedSchema, value, path, rootSchema));
  }

  if (types.length > 0 && !types.some((type) => matchesType(value, type))) {
    return [`${label} must be ${types.join(' or ')}.`];
  }

  if ('const' in schema && !valuesEqual(value, schema.const)) {
    issues.push(`${label} must be ${String(schema.const)}.`);
  }
  if (schema.enum && !schema.enum.some((item) => valuesEqual(item, value))) {
    issues.push(`${label} must be one of ${schema.enum.map(String).join(', ')}.`);
  }

  if (schema.allOf) {
    for (const variant of schema.allOf) {
      issues.push(...validate(variant, value, path, rootSchema));
    }
  }

  if (schema.anyOf) {
    const valid = schema.anyOf.some(
      (variant) => validate(variant, value, path, rootSchema).length === 0
    );
    if (!valid) issues.push(`${label} does not match any supported schema.`);
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter(
      (variant) => validate(variant, value, path, rootSchema).length === 0
    ).length;
    if (matches !== 1) issues.push(`${label} must match exactly one supported schema.`);
  }

  if (
    schema.not &&
    validate(schema.not, value, path, rootSchema).length === 0
  ) {
    issues.push(`${label} matches a disallowed schema.`);
  }

  if (schema.if) {
    const conditionMatches =
      validate(schema.if, value, path, rootSchema).length === 0;
    const branch = conditionMatches ? schema.then : schema.else;
    if (branch) issues.push(...validate(branch, value, path, rootSchema));
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      issues.push(`${label} must be >= ${schema.minimum}.`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      issues.push(`${label} must be <= ${schema.maximum}.`);
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      issues.push(`${label} must be > ${schema.exclusiveMinimum}.`);
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      issues.push(`${label} must be < ${schema.exclusiveMaximum}.`);
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push(`${label} must be at least ${schema.minLength} characters.`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      issues.push(`${label} must be at most ${schema.maxLength} characters.`);
    }
    if (schema.pattern) {
      try {
        if (!new RegExp(schema.pattern).test(value)) {
          issues.push(`${label} must match ${schema.pattern}.`);
        }
      } catch {
        // APISIX owns the schema. Ignore an invalid UI-side regular expression
        // and let the Admin API remain the final validation authority.
      }
    }
    if (schema.format && !matchesFormat(value, schema.format)) {
      issues.push(`${label} must match format ${schema.format}.`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      issues.push(`${label} must contain at least ${schema.minItems} items.`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      issues.push(`${label} must contain at most ${schema.maxItems} items.`);
    }
    if (schema.uniqueItems) {
      const unique = new Set(value.map((item) => JSON.stringify(item)));
      if (unique.size !== value.length) issues.push(`${label} must contain unique items.`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        issues.push(
          ...validate(schema.items, item, childPath(path, index), rootSchema)
        );
      });
    }
  }

  if (isRecord(value)) {
    const properties = schema.properties ?? {};
    const patterns = Object.entries(schema.patternProperties ?? {});
    const propertyCount = Object.keys(value).length;

    if (
      schema.minProperties !== undefined &&
      propertyCount < schema.minProperties
    ) {
      issues.push(
        `${label} must contain at least ${schema.minProperties} properties.`
      );
    }
    if (
      schema.maxProperties !== undefined &&
      propertyCount > schema.maxProperties
    ) {
      issues.push(
        `${label} must contain at most ${schema.maxProperties} properties.`
      );
    }

    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        issues.push(`${childPath(path, key)} is required.`);
      }
    }

    for (const [key, dependency] of Object.entries(schema.dependencies ?? {})) {
      if (!(key in value)) continue;
      if (Array.isArray(dependency)) {
        for (const dependentKey of dependency) {
          if (!(dependentKey in value)) {
            issues.push(`${childPath(path, dependentKey)} is required by ${key}.`);
          }
        }
      } else {
        issues.push(...validate(dependency, value, path, rootSchema));
      }
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      const propertySchema = properties[key];
      if (propertySchema) {
        issues.push(
          ...validate(
            propertySchema,
            nestedValue,
            childPath(path, key),
            rootSchema
          )
        );
        continue;
      }

      const matchingPatterns = patterns.filter(([pattern]) => {
        try {
          return new RegExp(pattern).test(key);
        } catch {
          return false;
        }
      });
      if (matchingPatterns.length > 0) {
        for (const [, patternSchema] of matchingPatterns) {
          issues.push(
            ...validate(
              patternSchema,
              nestedValue,
              childPath(path, key),
              rootSchema
            )
          );
        }
      } else if (schema.additionalProperties === false) {
        issues.push(`${childPath(path, key)} is not supported.`);
      } else if (isRecord(schema.additionalProperties)) {
        issues.push(
          ...validate(
            schema.additionalProperties,
            nestedValue,
            childPath(path, key),
            rootSchema
          )
        );
      }
    }
  }

  return issues;
};

export const validateSchemaValue = (
  schema: JSONSchema | undefined,
  value: unknown,
  path = '',
  rootSchema = schema
): string[] =>
  schema && rootSchema ? validate(schema, value, path, rootSchema) : [];

const collectActiveRequiredFields = (
  schema: JSONSchema,
  value: unknown,
  rootSchema: JSONSchema,
  required: Set<string>
) => {
  const referencedSchema = resolveLocalRef(rootSchema, schema.$ref);
  if (referencedSchema) {
    collectActiveRequiredFields(referencedSchema, value, rootSchema, required);
  }

  for (const key of schema.required ?? []) required.add(key);

  for (const variant of schema.allOf ?? []) {
    collectActiveRequiredFields(variant, value, rootSchema, required);
  }

  const matchingVariants = [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]
    .filter((variant) => validate(variant, value, '', rootSchema).length === 0);
  for (const variant of matchingVariants) {
    collectActiveRequiredFields(variant, value, rootSchema, required);
  }

  if (schema.if) {
    const branch =
      validate(schema.if, value, '', rootSchema).length === 0
        ? schema.then
        : schema.else;
    if (branch) collectActiveRequiredFields(branch, value, rootSchema, required);
  }

  if (isRecord(value)) {
    for (const [key, dependency] of Object.entries(schema.dependencies ?? {})) {
      if (!(key in value)) continue;
      if (Array.isArray(dependency)) {
        dependency.forEach((dependentKey) => required.add(dependentKey));
      } else {
        collectActiveRequiredFields(dependency, value, rootSchema, required);
      }
    }
  }
};

export const getActiveRequiredFields = (
  schema: JSONSchema,
  value: unknown,
  rootSchema = schema
): string[] => {
  const required = new Set<string>();
  collectActiveRequiredFields(schema, value, rootSchema, required);
  return [...required];
};

const collectSchemaProperties = (
  schema: JSONSchema,
  rootSchema: JSONSchema,
  value: unknown,
  properties: Record<string, JSONSchema>,
  visitedRefs: Set<string>
) => {
  if (schema.$ref && !visitedRefs.has(schema.$ref)) {
    const referencedSchema = resolveLocalRef(rootSchema, schema.$ref);
    if (referencedSchema) {
      visitedRefs.add(schema.$ref);
      collectSchemaProperties(
        referencedSchema,
        rootSchema,
        value,
        properties,
        visitedRefs
      );
    }
  }

  Object.assign(properties, schema.properties);
  for (const [pattern, patternSchema] of Object.entries(
    schema.patternProperties ?? {}
  )) {
    if (/^[a-zA-Z0-9_.-]+$/.test(pattern)) {
      properties[pattern] = patternSchema;
    }
  }

  const unionVariants = [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])];
  const matchingUnionVariants = unionVariants.filter(
    (variant) => validate(variant, value, '', rootSchema).length === 0
  );
  const conditionalBranch = schema.if
    ? validate(schema.if, value, '', rootSchema).length === 0
      ? schema.then
      : schema.else
    : undefined;
  const variants = [
    ...(schema.allOf ?? []),
    ...(matchingUnionVariants.length > 0
      ? matchingUnionVariants
      : unionVariants),
    ...(conditionalBranch ? [conditionalBranch] : []),
  ];
  for (const variant of variants) {
    collectSchemaProperties(
      variant,
      rootSchema,
      value,
      properties,
      visitedRefs
    );
  }
};

export const getSchemaProperties = (
  schema: JSONSchema,
  rootSchema = schema,
  value?: unknown
): Record<string, JSONSchema> => {
  const properties: Record<string, JSONSchema> = {};
  collectSchemaProperties(schema, rootSchema, value, properties, new Set());
  return properties;
};
