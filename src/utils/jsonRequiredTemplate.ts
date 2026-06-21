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
import { z, type ZodTypeAny } from 'zod';

import { getJsonSchemaFeedback } from '@/utils/jsonSchemaFeedback';

const unwrapSchema = (schema: ZodTypeAny): ZodTypeAny => {
  if (schema instanceof z.ZodEffects) return unwrapSchema(schema.innerType());
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapSchema(schema.removeDefault());
  }
  if (schema instanceof z.ZodBranded || schema instanceof z.ZodReadonly) {
    return unwrapSchema(schema.unwrap());
  }
  return schema;
};

const schemaAtPath = (
  schema: ZodTypeAny,
  segments: string[]
): ZodTypeAny | undefined => {
  const current = unwrapSchema(schema);
  if (segments.length === 0) return current;

  const [segment, ...rest] = segments;
  if (current instanceof z.ZodObject) {
    const child = current.shape[segment] as ZodTypeAny | undefined;
    return child ? schemaAtPath(child, rest) : undefined;
  }
  if (current instanceof z.ZodArray) {
    return schemaAtPath(current.element, rest);
  }
  if (current instanceof z.ZodUnion) {
    for (const option of current.options) {
      const found = schemaAtPath(option, segments);
      if (found) return found;
    }
  }
  if (current instanceof z.ZodDiscriminatedUnion) {
    for (const option of current.options.values()) {
      const found = schemaAtPath(option, segments);
      if (found) return found;
    }
  }
  return undefined;
};

const placeholderForSchema = (schema: ZodTypeAny | undefined): unknown => {
  if (!schema) return '';
  const current = unwrapSchema(schema);

  if (current instanceof z.ZodString) {
    const minimum =
      current._def.checks.find((check) => check.kind === 'min')?.value ?? 0;
    return minimum > 0 ? 'x'.repeat(minimum) : '';
  }
  if (current instanceof z.ZodNumber) {
    const minimum =
      current._def.checks.find((check) => check.kind === 'min')?.value ?? 0;
    return minimum;
  }
  if (current instanceof z.ZodBoolean) return false;
  if (current instanceof z.ZodArray) {
    const minimum = current._def.minLength?.value ?? 0;
    return Array.from(
      { length: minimum },
      () => placeholderForSchema(current.element)
    );
  }
  if (current instanceof z.ZodRecord || current instanceof z.ZodObject) return {};
  if (current instanceof z.ZodLiteral) return current.value;
  if (current instanceof z.ZodEnum) return current.options[0];
  if (current instanceof z.ZodNativeEnum) {
    return Object.values(current.enum).find(
      (value) => typeof value === 'string' || typeof value === 'number'
    );
  }
  if (current instanceof z.ZodUnion) {
    return placeholderForSchema(current.options[0]);
  }
  if (current instanceof z.ZodDiscriminatedUnion) {
    return placeholderForSchema(current.options.values().next().value);
  }
  return null;
};

const setPath = (
  target: Record<string, unknown>,
  path: string[],
  value: unknown
) => {
  let current = target;
  path.forEach((segment, index) => {
    if (index === path.length - 1) {
      current[segment] = value;
      return;
    }
    const next = current[segment];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  });
};

export const createRequiredJsonTemplate = (
  schema: ZodTypeAny,
  overrides: Record<string, unknown> = {}
) => {
  const template: Record<string, unknown> = {};
  const { requiredPaths } = getJsonSchemaFeedback(schema, '{}');

  requiredPaths.forEach((path) => {
    const segments = path.split('.');
    setPath(template, segments, placeholderForSchema(schemaAtPath(schema, segments)));
  });

  return { ...template, ...overrides };
};
