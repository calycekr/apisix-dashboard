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

export type PluginConfig = { name: string; config: object };
export type PluginEditorDrawerProps = Pick<PluginCardListProps, 'mode'> & {
  opened: boolean;
  onClose: () => void;
  onSave: (props: PluginConfig) => void;
  plugin: PluginConfig;
  schema?: object;
};

const toConfigStr = (p: object): string => {
  return !isEmpty(p) && !isNil(p) ? JSON.stringify(p, null, 2) : '{}';
};

const hasProperties = (schema: object | undefined): boolean => {
  if (!schema) return false;
  const s = schema as Record<string, unknown>;
  return typeof s.properties === 'object' && s.properties !== null;
};

export const PluginEditorDrawer = (props: PluginEditorDrawerProps) => {
  const { opened, onSave, onClose, plugin, mode, schema } = props;
  const { name, config } = plugin;

  const canUseForm = hasProperties(schema);
  const [activeTab, setActiveTab] = useState<string>(canUseForm ? 'form' : 'json');
  const [formValue, setFormValue] = useState<Record<string, unknown>>(
    config as Record<string, unknown>
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const methods = useForm<{ config: string }>({
    criteriaMode: 'all',
    disabled: mode === 'view',
    defaultValues: { config: toConfigStr(config) },
  });

  const handleClose = () => {
    onClose();
    methods.reset();
    setFormValue(config as Record<string, unknown>);
    setActiveTab(canUseForm ? 'form' : 'json');
    setSaveError(null);
  };

  useEffect(() => {
    methods.setValue('config', toConfigStr(config));
    setFormValue(config as Record<string, unknown>);
  }, [config, methods]);

  useEffect(() => {
    setActiveTab(canUseForm ? 'form' : 'json');
  }, [canUseForm]);

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

  const getCurrentConfig = (): object => {
    if (activeTab === 'form') {
      return formValue as object;
    }
    try {
      return JSON.parse(methods.getValues('config') || '{}') as object;
    } catch {
      return formValue as object;
    }
  };

  const tabItems = [
    ...(canUseForm
      ? [
          {
            key: 'form',
            label: 'Form',
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
              items={tabItems}
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
                        JSON.parse(methods.getValues('config') || '{}');
                      } catch (e) {
                        setSaveError('Invalid JSON: ' + String(e));
                        return;
                      }
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
