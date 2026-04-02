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
import { Editor } from '@monaco-editor/react';
import { useRouter } from '@tanstack/react-router';
import { Alert, Button, Modal, Space, Tabs } from 'antd';
import { useCallback, useState } from 'react';
import { type UseFormReturn } from 'react-hook-form';

import { useThemeMode } from '@/stores/global';

import { FormSubmitBtn } from './Btn';

type FormJsonTabsProps = {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => unknown;
  submitLabel?: string;
  disabled?: boolean;
};

const monacoOptions: import('@monaco-editor/react').EditorProps['options'] = {
  minimap: { enabled: false },
  automaticLayout: true,
  lineNumbers: 'on',
  contextmenu: false,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'none',
  lineDecorationsWidth: 0,
};

export const FormJsonTabs = (props: FormJsonTabsProps) => {
  const { children, form, onSubmit, submitLabel = 'Submit', disabled = false } = props;
  const { mode } = useThemeMode();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('form');
  const [jsonStr, setJsonStr] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTabChange = useCallback(
    (key: string) => {
      if (key === 'json' && activeTab === 'form') {
        // Serialize current form values to JSON editor
        const values = form.getValues();
        setJsonStr(JSON.stringify(values, null, 2));
        setJsonError(null);
      } else if (key === 'form' && activeTab === 'json') {
        // Parse JSON editor back into form
        try {
          const parsed = JSON.parse(jsonStr || '{}') as Record<string, unknown>;
          form.reset(parsed);
          setJsonError(null);
        } catch {
          // Keep current form state if JSON is invalid
        }
      }
      setActiveTab(key);
    },
    [activeTab, form, jsonStr]
  );

  const handleJsonSubmit = useCallback(async () => {
    setJsonError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr || '{}') as Record<string, unknown>;
    } catch (e) {
      setJsonError('Invalid JSON: ' + String(e));
      return;
    }
    // Reset form with parsed values then trigger Zod validation via handleSubmit
    form.reset(parsed);
    setIsSubmitting(true);
    try {
      await form.handleSubmit(onSubmit)();
    } finally {
      setIsSubmitting(false);
    }
  }, [jsonStr, form, onSubmit]);

  const handleCancel = useCallback(() => {
    if (form.formState.isDirty) {
      Modal.confirm({
        title: 'Discard changes?',
        content: 'You have unsaved changes. Are you sure you want to leave?',
        okText: 'Discard',
        cancelText: 'Stay',
        onOk: () => router.history.back(),
      });
    } else {
      router.history.back();
    }
  }, [form.formState.isDirty, router]);

  const tabItems = [
    {
      key: 'form',
      label: 'Form',
      children: (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {children}
          {!disabled && (
            <Space style={{ marginTop: 16 }}>
              <FormSubmitBtn>{submitLabel}</FormSubmitBtn>
              <Button size="middle" onClick={handleCancel}>
                Cancel
              </Button>
            </Space>
          )}
        </form>
      ),
    },
    {
      key: 'json',
      label: 'JSON',
      children: (
        <div>
          <div
            style={{
              border: jsonError ? '1px solid var(--ant-color-error)' : '1px solid var(--ant-color-border)',
              borderRadius: 6,
              overflow: 'hidden',
              minHeight: 500,
            }}
          >
            <Editor
              height="500px"
              language="json"
              theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
              value={jsonStr}
              onChange={(val) => {
                setJsonStr(val ?? '');
                setJsonError(null);
              }}
              options={{ ...monacoOptions, readOnly: disabled }}
            />
          </div>
          {jsonError && (
            <Alert
              type="error"
              message={jsonError}
              style={{ marginTop: 8 }}
              showIcon
            />
          )}
          {!disabled && (
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                size="middle"
                loading={isSubmitting}
                disabled={isSubmitting}
                onClick={handleJsonSubmit}
              >
                {submitLabel}
              </Button>
              <Button size="middle" onClick={handleCancel}>
                Cancel
              </Button>
            </Space>
          )}
        </div>
      ),
    },
  ];

  return (
    <Tabs
      activeKey={activeTab}
      onChange={handleTabChange}
      items={tabItems}
    />
  );
};
