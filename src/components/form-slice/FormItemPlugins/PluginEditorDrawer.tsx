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
import { Alert, Button, Drawer, message, Space, Tabs, Tooltip, Typography } from 'antd';
import { isEmpty, isNil } from 'rambdax';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { FormSubmitBtn } from '@/components/form/Btn';
import { FormItemEditor } from '@/components/form/Editor';
import { SchemaForm } from '@/components/schema-form/SchemaForm';
import {
  getActiveRequiredFields,
  getResolvedSchema,
  getSchemaProperties,
  type JSONSchema,
  schemaType,
  validateSchemaValue,
} from '@/components/schema-form/schemaValidation';
import IconContentCopy from '~icons/material-symbols/content-copy';
import IconFormatAlignLeft from '~icons/material-symbols/format-align-left';
import IconRefresh from '~icons/material-symbols/refresh';

import {
  getAIGatewayTemplates,
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
  onSave: (props: PluginConfig) => void | Promise<void>;
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

const isSchemaDefaultCompatible = (
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

const applySchemaDefaults = (
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
      isSchemaDefaultCompatible(resolvedPropSchema, resolvedPropSchema.default)
    ) {
      base[key] = cloneDefault(resolvedPropSchema.default);
    }
  }

  const properties = getSchemaProperties(typedSchema, root, base);
  for (const [key, rawPropSchema] of Object.entries(properties)) {
    const propSchema = getResolvedSchema(rawPropSchema, root);
    if (isRecord(base[key]) && isRecord(propSchema.properties)) {
      base[key] = applySchemaDefaults(
        propSchema,
        base[key] as Record<string, unknown>,
        root
      );
    }
    if (
      base[key] === undefined &&
      'default' in propSchema &&
      isSchemaDefaultCompatible(propSchema, propSchema.default)
    ) {
      base[key] = cloneDefault(propSchema.default);
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

const placeholderForSchema = (
  schema: JSONSchema,
  rootSchema: JSONSchema
): unknown => {
  const resolvedSchema = getResolvedSchema(schema, rootSchema);

  if (
    'default' in resolvedSchema &&
    isSchemaDefaultCompatible(resolvedSchema, resolvedSchema.default)
  ) {
    return cloneDefault(resolvedSchema.default);
  }
  if ('const' in resolvedSchema) return cloneDefault(resolvedSchema.const);
  if (resolvedSchema.enum?.length) return cloneDefault(resolvedSchema.enum[0]);

  const firstVariant = resolvedSchema.oneOf?.[0] ?? resolvedSchema.anyOf?.[0];
  if (!schemaType(resolvedSchema) && firstVariant) {
    return placeholderForSchema(firstVariant, rootSchema);
  }

  const type = schemaType(resolvedSchema);
  const hasResolvedProperties =
    Object.keys(resolvedSchema.properties ?? {}).length > 0;
  if (type === 'object' || hasResolvedProperties) {
    return buildSchemaTemplate(resolvedSchema, {}, rootSchema);
  }
  if (type === 'array') {
    if (resolvedSchema.minItems && resolvedSchema.minItems > 0 && resolvedSchema.items) {
      return [placeholderForSchema(resolvedSchema.items, rootSchema)];
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

const buildSchemaTemplate = (
  schema: object | undefined,
  config: Record<string, unknown> | undefined,
  rootSchema?: JSONSchema
): Record<string, unknown> => {
  const base = applySchemaDefaults(schema, config, rootSchema);
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
  const requiredKeys = [...required];

  for (const key of requiredKeys) {
    if (base[key] !== undefined) continue;
    const propSchema = properties[key] ?? typedSchema.properties?.[key];
    base[key] = propSchema ? placeholderForSchema(propSchema, root) : '';
  }

  for (const [key, value] of Object.entries(base)) {
    const propSchema = properties[key] ?? typedSchema.properties?.[key];
    if (isRecord(value) && propSchema) {
      const resolvedPropSchema = getResolvedSchema(propSchema, root);
      if (resolvedPropSchema.properties) {
        base[key] = buildSchemaTemplate(resolvedPropSchema, value, root);
      }
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
  return mode === 'add' ? buildSchemaTemplate(schema, base) : base;
};

const MAX_LIVE_ISSUES = 5;

export const PluginEditorDrawer = (props: PluginEditorDrawerProps) => {
  const { opened, onSave, onClose, plugin, mode, schema } = props;
  const { name, config } = plugin;

  const canUseForm = hasProperties(schema);
  const defaultTab = canUseForm ? 'form' : 'json';
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
  const jsonConfigText = useWatch({
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
    setActiveTab(canUseForm ? 'form' : 'json');
  }, [canUseForm, name]);

  const handleTabChange = useCallback((key: string) => {
    if (key === 'json' && activeTab === 'form') {
      // Serialize form values to JSON editor
      methods.setValue('config', toConfigStr(formValue as object));
    } else if (key === 'form' && activeTab === 'json') {
      // Parse JSON editor to form values. If the JSON is currently invalid, stay
      // on the JSON tab and surface the error rather than silently discarding edits.
      try {
        const parsed = JSON.parse(methods.getValues('config') || '{}') as Record<string, unknown>;
        setFormValue(parsed);
      } catch {
        setSaveError('Fix the JSON syntax error before switching to the fields view.');
        return;
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
          height={420}
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
    const nextValue = mode === 'add'
      ? buildSchemaTemplate(schema, template)
      : applySchemaDefaults(schema, template);
    setFormValue(nextValue);
    methods.setValue('config', toConfigStr(nextValue));
    setActiveTab(canUseForm ? 'form' : 'json');
    setSaveError(null);
  };

  const formatJsonConfig = useCallback(() => {
    try {
      const parsed = JSON.parse(methods.getValues('config') || '{}');
      if (!isRecord(parsed)) {
        setSaveError('Plugin config must be a JSON object.');
        return;
      }
      const formatted = toConfigStr(parsed);
      methods.setValue('config', formatted, { shouldDirty: true });
      setFormValue(parsed);
      setSaveError(null);
      message.success('Plugin JSON formatted');
    } catch (error) {
      setSaveError(`Invalid JSON: ${String(error)}`);
    }
  }, [methods]);

  const copyJsonConfig = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(methods.getValues('config') || '{}');
      message.success('Plugin JSON copied');
    } catch {
      message.error('Failed to copy plugin JSON');
    }
  }, [methods]);

  const resetJsonConfig = useCallback(() => {
    const nextValue = getEditableConfig(schema, config, mode);
    methods.setValue('config', toConfigStr(nextValue), { shouldDirty: true });
    setFormValue(nextValue);
    setSaveError(null);
  }, [config, methods, mode, schema]);
  const jsonValidation = useMemo(() => {
    if (activeTab !== 'json' || mode === 'view') return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonConfigText || '{}');
    } catch (error) {
      return {
        message: 'Fix JSON syntax before saving.',
        issues: [error instanceof Error ? error.message : String(error)],
      };
    }

    if (!isRecord(parsed)) {
      return {
        message: 'Plugin config must be a JSON object.',
        issues: ['The top-level JSON value is not an object.'],
      };
    }

    const issues = [
      ...validateSchemaValue(schema as JSONSchema | undefined, parsed),
      ...validateAIGatewayConfig(name, parsed),
      ...validatePluginCompatibility(name, parsed),
    ];
    if (issues.length === 0) return null;

    return {
      message: `${issues.length} plugin config issue${issues.length === 1 ? '' : 's'}`,
      issues,
    };
  }, [activeTab, jsonConfigText, mode, name, schema]);
  const saveErrorActions =
    activeTab === 'json' && mode !== 'view' ? (
      <Space wrap>
        <Button
          size="small"
          icon={<IconFormatAlignLeft />}
          onClick={formatJsonConfig}
          aria-label="Format JSON after error"
        >
          Format JSON
        </Button>
        <Button
          size="small"
          icon={<IconRefresh />}
          onClick={resetJsonConfig}
          aria-label="Reset JSON after error"
        >
          Reset JSON
        </Button>
      </Space>
    ) : undefined;

  const handleSave = methods.handleSubmit(
    async () => {
      setSaveError(null);
      const cfg = getCurrentConfig();
      if (activeTab === 'json') {
        try {
          const parsed = JSON.parse(methods.getValues('config') || '{}') as unknown;
          if (!isRecord(parsed)) {
            setSaveError('Plugin config must be a JSON object.');
            return;
          }
        } catch (error) {
          setSaveError(`Invalid JSON: ${String(error)}`);
          return;
        }
      }
      const schemaIssues = validateSchemaValue(
        schema as JSONSchema | undefined,
        cfg
      );
      const aiGatewayIssues = validateAIGatewayConfig(name, cfg);
      const compatibilityIssues = validatePluginCompatibility(name, cfg);
      const issues = [
        ...schemaIssues,
        ...aiGatewayIssues,
        ...compatibilityIssues,
      ];
      if (issues.length > 0) {
        setSaveError(issues.join('\n'));
        return;
      }
      try {
        await onSave({ name, config: cfg });
        handleClose();
      } catch (error) {
        setSaveError(
          `Save or verification failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
    (errors) => {
      const messages = Object.entries(errors)
        .map(([key, value]) =>
          `${key}: ${(value as { message?: string })?.message ?? 'invalid'}`
        )
        .join('\n');
      setSaveError(messages || 'Validation failed');
    }
  );

  return (
    <FormProvider {...methods}>
      <Drawer
        placement="right"
        styles={{
          wrapper: { width: 620, maxWidth: '100vw' },
          body: { paddingTop: '18px' },
        }}
        keyboard={false}
        open={opened}
        onClose={handleClose}
        title={`${title}: ${name}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode !== 'view' && (
              <FormSubmitBtn type="primary" onClick={handleSave}>
                {mode === 'add' ? 'Add Plugin' : 'Save Changes'}
              </FormSubmitBtn>
            )}
          </div>
        }
      >
        {schema && typeof schema === 'object' && 'description' in schema && (
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 'var(--app-font-size-md)' }}>
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
        {activeTab === 'json' && mode !== 'view' && (
          <Space style={{ width: '100%', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Tooltip title="Format JSON">
              <Button
                size="small"
                icon={<IconFormatAlignLeft />}
                onClick={formatJsonConfig}
                aria-label="Format plugin JSON"
              />
            </Tooltip>
            <Tooltip title="Copy JSON">
              <Button
                size="small"
                icon={<IconContentCopy />}
                onClick={copyJsonConfig}
                aria-label="Copy plugin JSON"
              />
            </Tooltip>
            <Tooltip title="Reset JSON">
              <Button
                size="small"
                icon={<IconRefresh />}
                onClick={resetJsonConfig}
                aria-label="Reset plugin JSON"
              />
            </Tooltip>
          </Space>
        )}
        {jsonValidation && (
          <Alert
            type="warning"
            showIcon
            message={jsonValidation.message}
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {jsonValidation.issues.slice(0, MAX_LIVE_ISSUES).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
                {jsonValidation.issues.length > MAX_LIVE_ISSUES && (
                  <li>
                    {jsonValidation.issues.length - MAX_LIVE_ISSUES} more issue
                    {jsonValidation.issues.length - MAX_LIVE_ISSUES === 1 ? '' : 's'}
                  </li>
                )}
              </ul>
            }
            style={{ marginBottom: 8 }}
          />
        )}
        {mode !== 'view' && saveError && (
          <Alert
            type="error"
            showIcon
            message={saveError}
            action={saveErrorActions}
            closable
            onClose={() => setSaveError(null)}
            style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}
          />
        )}
        <form>
          {canUseForm ? (
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
            />
          ) : (
            <FormItemEditor
              name="config"
              customSchema={schema}
              isLoading={!schema}
              height={420}
              required
            />
          )}
        </form>
      </Drawer>
    </FormProvider>
  );
};
