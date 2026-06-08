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
import { Alert, Drawer, Tabs, Typography } from 'antd';
import { isEmpty, isNil } from 'rambdax';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { FormSubmitBtn } from '@/components/form/Btn';
import { FormItemEditor } from '@/components/form/Editor';
import { SchemaForm } from '@/components/schema-form/SchemaForm';

import type { PluginCardListProps } from './PluginCardList';

export type PluginConfig = { name: string; config: Record<string, unknown> };
export type PluginEditorDrawerProps = Pick<PluginCardListProps, 'mode'> & {
  opened: boolean;
  onClose: () => void;
  onSave: (props: PluginConfig) => void;
  plugin: PluginConfig;
  schema?: object;
};

const toConfigStr = (p: object | undefined): string => {
  return !isEmpty(p) && !isNil(p) ? JSON.stringify(p, null, 2) : '{}';
};

const hasProperties = (schema: object | undefined): boolean => {
  if (!schema) return false;
  const s = schema as Record<string, unknown>;
  return typeof s.properties === 'object' && s.properties !== null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const cloneDefault = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(cloneDefault);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneDefault(nestedValue)])
    );
  }
  return value;
};

const applySchemaDefaults = (
  schema: object | undefined,
  config: Record<string, unknown> | undefined
): Record<string, unknown> => {
  const base = isRecord(config) ? { ...config } : {};
  if (!schema || !isRecord(schema) || !isRecord(schema.properties)) return base;

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (!isRecord(propSchema)) continue;
    if (base[key] === undefined && 'default' in propSchema) {
      base[key] = cloneDefault(propSchema.default);
    }
    if (isRecord(base[key]) && isRecord(propSchema.properties)) {
      base[key] = applySchemaDefaults(propSchema, base[key] as Record<string, unknown>);
    }
  }

  return base;
};

const getEditableConfig = (
  schema: object | undefined,
  config: Record<string, unknown> | undefined,
  mode: PluginCardListProps['mode']
): Record<string, unknown> => {
  const base = isRecord(config) ? { ...config } : {};
  return mode === 'add' ? applySchemaDefaults(schema, base) : base;
};

const isEmptyRequiredValue = (value: unknown): boolean => {
  return value === undefined || value === null || value === '';
};

const getSchemaTypes = (schema: Record<string, unknown>): string[] => {
  if (Array.isArray(schema.type)) {
    return schema.type.filter((item): item is string => typeof item === 'string');
  }
  return typeof schema.type === 'string' ? [schema.type] : [];
};

const matchesSchemaType = (value: unknown, type: string): boolean => {
  if (type === 'object') return isRecord(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  return true;
};

const collectSchemaIssues = (
  schema: object | undefined,
  value: Record<string, unknown>,
  prefix = ''
): string[] => {
  if (!schema || !isRecord(schema)) return [];
  const issues: string[] = [];
  const required = Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === 'string')
    : [];
  const properties = isRecord(schema.properties) ? schema.properties : {};

  for (const key of required) {
    if (isEmptyRequiredValue(value[key])) {
      issues.push(`${prefix}${key} is required.`);
    }
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    if (!isRecord(propSchema)) {
      continue;
    }
    const currentValue = value[key];
    if (isEmptyRequiredValue(currentValue)) continue;

    const schemaTypes = getSchemaTypes(propSchema);
    if (
      schemaTypes.length > 0 &&
      !schemaTypes.some((type) => matchesSchemaType(currentValue, type))
    ) {
      issues.push(`${prefix}${key} must be ${schemaTypes.join(' or ')}.`);
      continue;
    }

    if (Array.isArray(propSchema.enum) && !propSchema.enum.includes(currentValue)) {
      issues.push(`${prefix}${key} must be one of ${propSchema.enum.map(String).join(', ')}.`);
    }

    if (typeof currentValue === 'number') {
      if (typeof propSchema.minimum === 'number' && currentValue < propSchema.minimum) {
        issues.push(`${prefix}${key} must be >= ${propSchema.minimum}.`);
      }
      if (typeof propSchema.maximum === 'number' && currentValue > propSchema.maximum) {
        issues.push(`${prefix}${key} must be <= ${propSchema.maximum}.`);
      }
    }

    if (typeof currentValue === 'string') {
      if (typeof propSchema.minLength === 'number' && currentValue.length < propSchema.minLength) {
        issues.push(`${prefix}${key} must be at least ${propSchema.minLength} characters.`);
      }
      if (typeof propSchema.maxLength === 'number' && currentValue.length > propSchema.maxLength) {
        issues.push(`${prefix}${key} must be at most ${propSchema.maxLength} characters.`);
      }
    }

    if (isRecord(propSchema.properties) && isRecord(currentValue)) {
      issues.push(...collectSchemaIssues(propSchema, currentValue, `${prefix}${key}.`));
    }
  }

  return issues;
};

export const PluginEditorDrawer = (props: PluginEditorDrawerProps) => {
  const { opened, onSave, onClose, plugin, mode, schema } = props;
  const { name, config } = plugin;

  const canUseForm = hasProperties(schema);
  const [activeTab, setActiveTab] = useState<string>('json');
  const [formValue, setFormValue] = useState<Record<string, unknown>>(
    getEditableConfig(schema, config, mode)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const methods = useForm<{ config: string }>({
    criteriaMode: 'all',
    disabled: mode === 'view',
    defaultValues: { config: toConfigStr(getEditableConfig(schema, config, mode)) },
  });

  const handleClose = () => {
    onClose();
    methods.reset();
    setFormValue(getEditableConfig(schema, config, mode));
    setActiveTab('json');
    setSaveError(null);
  };

  useEffect(() => {
    const nextValue = getEditableConfig(schema, config, mode);
    methods.reset({ config: toConfigStr(nextValue) });
    setFormValue(nextValue);
  }, [config, methods, mode, schema]);

  useEffect(() => {
    setActiveTab('json');
  }, [name]);

  const handleTabChange = useCallback((key: string) => {
    if (key === 'json' && activeTab === 'form') {
      // Serialize form values to JSON editor
      methods.setValue('config', toConfigStr(formValue as object));
    } else if (key === 'form' && activeTab === 'json') {
      // Parse JSON editor to form values
      try {
        const parsed = JSON.parse(methods.getValues('config') || '{}') as Record<string, unknown>;
        setFormValue(parsed);
      } catch {
        // Keep current form value if JSON is invalid
      }
    }
    setActiveTab(key);
  }, [activeTab, formValue, methods]);

  const handleFormChange = useCallback((val: Record<string, unknown>) => {
    setFormValue(val);
  }, []);

  const title = mode === 'add'
    ? 'Add Plugin'
    : mode === 'edit'
      ? 'Edit Plugin'
      : 'View Plugin';

  const getCurrentConfig = (): Record<string, unknown> => {
    if (activeTab === 'form') {
      return formValue;
    }
    try {
      const parsed = JSON.parse(methods.getValues('config') || '{}') as unknown;
      return isRecord(parsed) ? parsed : formValue;
    } catch {
      return formValue;
    }
  };

  const tabItems = [
    ...(canUseForm
      ? [
          {
            key: 'form',
            label: 'Fields',
            children: (
              <SchemaForm
                schema={schema as Record<string, unknown>}
                value={formValue}
                onChange={handleFormChange}
                disabled={mode === 'view'}
              />
            ),
          },
        ]
      : []),
    {
      key: 'json',
      label: 'JSON',
      children: (
        <FormItemEditor
          name="config"
          customSchema={schema}
          isLoading={!schema}
          required
        />
      ),
    },
  ];

  return (
    <Drawer
      placement="right"
      width="md"
      keyboard={false}
      open={opened}
      onClose={handleClose}
      title={title}
      styles={{ body: { paddingTop: '18px' } }}
    >
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        {name}
      </Typography.Title>
      {schema && typeof schema === 'object' && 'description' in schema && (
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          {String((schema as { description: string }).description)}
        </Typography.Text>
      )}
      <FormProvider {...methods}>
        <form>
          {canUseForm ? (
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={[tabItems[tabItems.length - 1], ...tabItems.slice(0, -1)]}
            />
          ) : (
            <FormItemEditor
              name="config"
              customSchema={schema}
              isLoading={!schema}
              required
            />
          )}
        </form>

        {mode !== 'view' && (
          <>
            {saveError && (
              <Alert
                type="error"
                showIcon
                message={saveError}
                closable
                onClose={() => setSaveError(null)}
                style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <FormSubmitBtn
                size="small"
                type="text"
                onClick={methods.handleSubmit(
                  () => {
                    setSaveError(null);
                    const cfg = getCurrentConfig();
                    if (activeTab === 'json') {
                      // Validate JSON is parseable
                      try {
                        const parsed = JSON.parse(methods.getValues('config') || '{}') as unknown;
                        if (!isRecord(parsed)) {
                          setSaveError('Plugin config must be a JSON object.');
                          return;
                        }
                      } catch (e) {
                        setSaveError('Invalid JSON: ' + String(e));
                        return;
                      }
                    }
                    const schemaIssues = collectSchemaIssues(schema, cfg);
                    if (schemaIssues.length > 0) {
                      setSaveError(schemaIssues.join('\n'));
                      return;
                    }
                    onSave({ name, config: cfg });
                    handleClose();
                  },
                  (errors) => {
                    const msgs = Object.entries(errors)
                      .map(([k, v]) => `${k}: ${(v as { message?: string })?.message ?? 'invalid'}`)
                      .join('\n');
                    setSaveError(msgs || 'Validation failed');
                  }
                )}
              >
                {mode === 'add' && 'Add'}
                {mode === 'edit' && 'Save'}
              </FormSubmitBtn>
            </div>
          </>
        )}
      </FormProvider>
    </Drawer>
  );
};
