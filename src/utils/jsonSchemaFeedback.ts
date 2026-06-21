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
import type { ZodIssue, ZodTypeAny } from 'zod';

import { isRecord } from '@/utils/apisixEditable';

export const formatJsonSchemaPath = (issue: ZodIssue) =>
  issue.path.length > 0 ? issue.path.join('.') : 'Root';

const isMissingIssue = (issue: ZodIssue) =>
  (issue.code === 'invalid_type' && issue.received === 'undefined') ||
  issue.code === 'invalid_union_discriminator' ||
  (issue.code === 'custom' && /required/i.test(issue.message));

const uniquePaths = (issues: ZodIssue[]) =>
  Array.from(
    new Set(
      issues
        .filter(isMissingIssue)
        .map(formatJsonSchemaPath)
        .filter((path) => path !== 'Root')
    )
  );

export const getJsonSchemaFeedback = (schema: ZodTypeAny, value: string) => {
  const emptyResult = schema.safeParse({});
  const requiredPaths = emptyResult.success
    ? []
    : uniquePaths(emptyResult.error.issues);

  let parsed: unknown;
  try {
    parsed = JSON.parse(value || '{}');
  } catch (error) {
    return {
      requiredPaths,
      parsed: undefined,
      syntaxError: error instanceof Error ? error.message : String(error),
      issues: [] as ZodIssue[],
    };
  }

  if (!isRecord(parsed)) {
    return {
      requiredPaths,
      parsed,
      syntaxError: 'The top-level JSON value must be an object.',
      issues: [] as ZodIssue[],
    };
  }

  const result = schema.safeParse(parsed);
  return {
    requiredPaths,
    parsed,
    syntaxError: null,
    issues: result.success ? [] : result.error.issues,
  };
};
