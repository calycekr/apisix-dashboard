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
import { Alert, Button, Drawer, Space, Tabs, Typography } from 'antd';
import { isEmpty, isNil } from 'rambdax';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { FormSubmitBtn } from '@/components/form/Btn';
import { FormItemEditor } from '@/components/form/Editor';
import { SchemaForm } from '@/components/schema-form/SchemaForm';
import {
  getResolvedSchema,
  getSchemaProperties,
  type JSONSchema,
  validateSchemaValue,
} from '@/components/schema-form/schemaValidation';

import {
  getAIGatewayTemplates,
  isAIGatewayPlugin,
  validateAIGatewayConfig,
} from './aiGateway';
import type { PluginCardListProps } from './PluginCardList';
import {
  getPluginCompatibilityNotices,
  validatePluginCompatibility,
} from './pluginCompatibility';

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
  if (!schema || !isRecord(schema)) return base;
  const typedSchema = schema as JSONSchema;

  for (const [key, propSchema] of Object.entries(typedSchema.properties ?? {})) {
    if (!isRecord(propSchema)) continue;
    if (base[key] === undefined && 'default' in propSchema) {
      base[key] = cloneDefault(propSchema.default);
    }
  }

  const properties = getSchemaProperties(typedSchema, typedSchema, base);
  for (const [key, rawPropSchema] of Object.entries(properties)) {
    const propSchema = getResolvedSchema(rawPropSchema, typedSchema);
    if (isRecord(base[key]) && isRecord(propSchema.properties)) {
      base[key] = applySchemaDefaults(propSchema, base[key] as Record<string, unknown>);
    }
    if (base[key] === undefined && 'default' in propSchema) {
      base[key] = cloneDefault(propSchema.default);
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

export const PluginEditorDrawer = (props: PluginEditorDrawerProps) => {
  const { opened, onSave, onClose, plugin, mode, schema } = props;
  const { name, config } = plugin;

  const canUseForm = hasProperties(schema);
  const defaultTab = canUseForm && isAIGatewayPlugin(name) ? 'form' : 'json';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [formValue, setFormValue] = useState<Record<string, unknown>>(
    getEditableConfig(schema, config, mode)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const methods = useForm<{ config: string }>({
    criteriaMode: 'all',
    disabled: mode === 'view',
    defaultValues: { config: toConfigStr(getEditableConfig(schema, config, mode)) },
  });
  const watchedConfig = useWatch({
    control: methods.control,
    name: 'config',
  });

  const handleClose = () => {
    onClose();
    methods.reset();
    setFormValue(getEditableConfig(schema, config, mode));
    setActiveTab(defaultTab);
    setSaveError(null);
  };

  useEffect(() => {
    const nextValue = getEditableConfig(schema, config, mode);
    methods.reset({ config: toConfigStr(nextValue) });
    setFormValue(nextValue);
  }, [config, methods, mode, schema]);

  useEffect(() => {
    setActiveTab(canUseForm && isAIGatewayPlugin(name) ? 'form' : 'json');
  }, [canUseForm, name]);

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
      const parsed = JSON.parse(watchedConfig || '{}') as unknown;
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
  const aiTemplates =
    mode === 'add' ? getAIGatewayTemplates(name) : [];
  const compatibilityNotices = getPluginCompatibilityNotices(
    name,
    getCurrentConfig()
  );

  const applyTemplate = (template: Record<string, unknown>) => {
    const nextValue = applySchemaDefaults(schema, template);
    setFormValue(nextValue);
    methods.setValue('config', toConfigStr(nextValue));
    setActiveTab(canUseForm ? 'form' : 'json');
    setSaveError(null);
  };

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
      {aiTemplates.length > 0 && (
        <Alert
          type="info"
          showIcon
          message="AI Gateway quick start"
          description={
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Text type="secondary">
                Choose a provider template, then replace model, endpoint, and Secret
                Reference placeholders for your environment.
              </Typography.Text>
              <Space wrap>
                {aiTemplates.map((template) => (
                  <Button
                    key={template.key}
                    onClick={() => applyTemplate(template.config)}
                    title={template.description}
                  >
                    {template.label}
                  </Button>
                ))}
              </Space>
            </Space>
          }
          style={{ marginBottom: 12 }}
        />
      )}
      {compatibilityNotices.map((notice) => (
        <Alert
          key={notice.key}
          type={notice.type}
          showIcon
          message={notice.message}
          description={notice.description}
          style={{ marginBottom: 12 }}
        />
      ))}
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
                    const schemaIssues = validateSchemaValue(
                      schema as JSONSchema | undefined,
                      cfg
                    );
                    const aiGatewayIssues = validateAIGatewayConfig(name, cfg);
                    const compatibilityIssues = validatePluginCompatibility(
                      name,
                      cfg
                    );
                    const issues = [
                      ...schemaIssues,
                      ...aiGatewayIssues,
                      ...compatibilityIssues,
                    ];
                    if (issues.length > 0) {
                      setSaveError(issues.join('\n'));
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
