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
import { DiffEditor, Editor } from '@monaco-editor/react';
import { useBlocker, useRouter } from '@tanstack/react-router';
import { Alert, Button, Input, message, Modal, Space, Tabs, Typography } from 'antd';
import { clsx } from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type UseFormReturn } from 'react-hook-form';

import { AdminApiJsonEditor } from '@/components/page/AdminApiJsonEditor';
import { queryClient } from '@/config/global';
import { useThemeMode } from '@/stores/global';
import { stripSystemReadonlyFields } from '@/utils/apisixEditable';

import { FormSubmitBtn } from './Btn';
import classes from './FormJsonTabs.module.css';

interface CurlValues {
  methods?: string[];
  uri?: string;
  uris?: string[];
  host?: string;
  hosts?: string[];
}

function generateCurlCommand(values: CurlValues | null | undefined, targetHost: string): string {
  if (!values) return '';
  const method = (values.methods && values.methods[0]) || 'GET';
  const uri = values.uri || (values.uris && values.uris[0]) || '/';

  let headerOption = '';
  const hostHeader = values.host || (values.hosts && values.hosts[0]);
  if (hostHeader && hostHeader !== '*') {
    headerOption = ` -H "Host: ${hostHeader}"`;
  }

  const urlHost = targetHost.replace(/\/$/, '') || 'localhost:9080';
  return `curl -i -X ${method.toUpperCase()}${headerOption} "http://${urlHost}${uri}"`;
}

function flattenErrors(
  errors: Record<string, unknown>,
  prefix = ''
): Array<{ path: string; message: string }> {
  const result: Array<{ path: string; message: string }> = [];
  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && 'message' in value) {
      result.push({ path, message: String((value as { message: string }).message) });
    } else if (value && typeof value === 'object') {
      result.push(...flattenErrors(value as Record<string, unknown>, path));
    }
  }
  return result;
}

function hasAnyDirtyField(dirtyFields: unknown): boolean {
  if (!dirtyFields || typeof dirtyFields !== 'object') return false;
  return Object.values(dirtyFields as Record<string, unknown>).some((value) => {
    if (value === true) return true;
    if (value && typeof value === 'object') return hasAnyDirtyField(value);
    return false;
  });
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function formatErrorPath(path: string): string {
  if (path.startsWith('plugins.')) {
    const parts = path.split('.');
    const pluginName = parts[1];
    const fieldName = parts.slice(2).join(' > ');
    return `Plugin: ${pluginName} > ${fieldName || 'Config'}`;
  }

  let readable = path;
  readable = readable.replace(/\.(\d+)\./g, (_match, p1) => ` #${Number(p1) + 1} > `);
  readable = readable.replace(/\.(\d+)$/g, (_match, p1) => ` #${Number(p1) + 1}`);

  const labelMap: Record<string, string> = {
    uri: 'Request Path (URI)',
    uris: 'Request Paths (URIs)',
    name: 'Name',
    desc: 'Description',
    host: 'Host',
    hosts: 'Hosts',
    port: 'Port',
    weight: 'Weight',
    priority: 'Priority',
    upstream: 'Upstream',
    nodes: 'Target Nodes',
    timeout: 'Timeout',
    connect: 'Connect Timeout',
    send: 'Send Timeout',
    read: 'Read Timeout',
    type: 'Type',
    username: 'Username',
    plugins: 'Plugins',
    pass_host: 'Pass Host',
    upstream_id: 'Upstream ID',
    service_id: 'Service ID',
  };

  const segments = readable.split('.');
  const formattedSegments = segments.map((seg) => {
    const trimmed = seg.trim();
    return labelMap[trimmed] || trimmed;
  });

  return formattedSegments.join(' > ');
}

const FormErrorSummary = ({
  errors,
  onFocusError,
}: {
  errors: Array<{ path: string; message: string }>;
  onFocusError: (path: string) => void;
}) => {
  if (errors.length === 0) return null;
  return (
    <Alert
      type="error"
      showIcon
      style={{ marginBottom: 16 }}
      message={`${errors.length} validation error(s)`}
      description={
        <ul className={classes.errorList}>
          {errors.slice(0, 10).map((e) => (
            <li key={e.path} className={classes.errorItem}>
              <button
                type="button"
                className={classes.errorLink}
                onClick={() => onFocusError(e.path)}
              >
                <strong className={classes.errorPath}>{formatErrorPath(e.path)}</strong>
                <span>{e.message}</span>
              </button>
            </li>
          ))}
          {errors.length > 10 && <li>...and {errors.length - 10} more</li>}
        </ul>
      }
    />
  );
};

type FormJsonTabsProps = {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => unknown;
  submitLabel?: string;
  disabled?: boolean;
  /** Raw API response data — shown as the Admin API JSON tab so users can see actual APISIX state */
  rawData?: unknown;
  /** Admin API endpoint for direct JSON editing, e.g. '/routes/123'. */
  adminApi?: string;
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

const FormActionBar = ({
  children,
  errorCount,
  hasUnsavedChanges,
  onFocusFirstError,
  onRevert,
}: {
  children: React.ReactNode;
  errorCount: number;
  hasUnsavedChanges: boolean;
  onFocusFirstError: () => void;
  onRevert?: () => void;
}) => {
  let dotClass = classes.statusDotSuccess;
  let statusText = 'No pending changes';

  if (errorCount > 0) {
    dotClass = classes.statusDotError;
    statusText = `${errorCount} validation error${errorCount === 1 ? '' : 's'}`;
  } else if (hasUnsavedChanges) {
    dotClass = classes.statusDotWarning;
    statusText = 'Unsaved changes';
  }

  return (
    <div className={classes.actionBar}>
      <div className={classes.actionPanel}>
        <div className={classes.actionStatusWrapper}>
          <span className={clsx(classes.statusDot, dotClass)} />
          <span className={classes.actionStatus} aria-live="polite">
            {statusText}
          </span>
        </div>
        <Space wrap>
          {errorCount > 0 && (
            <Button danger size="middle" onClick={onFocusFirstError}>
              Review first error
            </Button>
          )}
          {hasUnsavedChanges && onRevert && (
            <Button size="middle" onClick={onRevert}>
              Revert changes
            </Button>
          )}
          {children}
        </Space>
      </div>
    </div>
  );
};

export const FormJsonTabs = (props: FormJsonTabsProps) => {
  const { children, form, onSubmit, submitLabel = 'Submit', disabled = false, rawData, adminApi } = props;
  const { mode } = useThemeMode();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('form');
  const [jsonStr, setJsonStr] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [jsonTabDirty, setJsonTabDirty] = useState<boolean>(false);
  const [rawTabDirty, setRawTabDirty] = useState<boolean>(false);
  const [rawTabSaving, setRawTabSaving] = useState<boolean>(false);
  const [curlTargetHost, setCurlTargetHost] = useState<string>(() => {
    try {
      return localStorage.getItem('apisix-dashboard:curl-target-host') || 'localhost:9080';
    } catch {
      return 'localhost:9080';
    }
  });
  const pendingSubmitRef = useRef<unknown>(null);

  const hasUnsavedChanges =
    (hasAnyDirtyField(form.formState.dirtyFields) || jsonTabDirty || rawTabDirty) &&
    !disabled &&
    !isSaving &&
    !rawTabSaving;
  const validationErrors = flattenErrors(form.formState.errors);

  const focusFormError = useCallback(
    (path: string) => {
      setActiveTab('form');
      window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(
          `[data-form-field="${escapeAttributeValue(path)}"]`
        );
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          form.setFocus(path, { shouldSelect: true });
          
          target.classList.add('form-field-error-shake');
          setTimeout(() => {
            target.classList.remove('form-field-error-shake');
          }, 600);
          
          return;
        }

        if (path.startsWith('plugins.')) {
          const parts = path.split('.');
          const pluginName = parts[1];
          if (pluginName) {
            const editBtn = document.querySelector<HTMLButtonElement>(
              `[data-testid="plugin-${pluginName}-edit"], [data-testid="plugin-${pluginName}-view"]`
            );
            if (editBtn) {
              editBtn.click();
              setTimeout(() => {
                const subTarget = document.querySelector<HTMLElement>(
                  `[data-form-field="${escapeAttributeValue(path)}"]`
                );
                if (subTarget) {
                  subTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  form.setFocus(path, { shouldSelect: true });
                  
                  subTarget.classList.add('form-field-error-shake');
                  setTimeout(() => {
                    subTarget.classList.remove('form-field-error-shake');
                  }, 600);
                }
              }, 150);
            }
          }
        }
      });
    },
    [form]
  );

  const focusFirstFormError = useCallback(() => {
    const firstError = flattenErrors(form.formState.errors)[0];
    if (firstError) {
      focusFormError(firstError.path);
    }
  }, [focusFormError, form.formState.errors]);

  const handleRevert = useCallback(() => {
    Modal.confirm({
      title: 'Discard all unsaved changes?',
      content: 'Are you sure you want to revert all changes to the last saved state?',
      okText: 'Revert',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      onOk: () => {
        form.reset();
        if (activeTab === 'json') {
          const values = form.getValues() as Record<string, unknown>;
          const sanitizedValues = rawData ? stripSystemReadonlyFields(values) : values;
          setJsonStr(JSON.stringify(sanitizedValues, null, 2));
          setJsonTabDirty(false);
          setJsonError(null);
        }
        setRawTabDirty(false);
      },
    });
  }, [form, activeTab, rawData]);

  const doSubmit = useCallback(
    async (data: unknown) => {
      setApiError(null);
      setIsSaving(true);
      try {
        await onSubmit(data);
        form.reset(data, { keepDefaultValues: false });
        setJsonTabDirty(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setApiError(`Save failed: ${msg}`);
      } finally {
        setIsSaving(false);
      }
    },
    [form, onSubmit]
  );

  // Show diff modal before saving when rawData is available (edit mode)
  const safeSubmit = useCallback(
    async (data: unknown) => {
      if (rawData) {
        pendingSubmitRef.current = data;
        setDiffModalOpen(true);
      } else {
        await doSubmit(data);
      }
    },
    [rawData, doSubmit]
  );

  const confirmDiffAndSave = useCallback(async () => {
    setDiffModalOpen(false);
    if (pendingSubmitRef.current) {
      await doSubmit(pendingSubmitRef.current);
      pendingSubmitRef.current = null;
    }
  }, [doSubmit]);

  // Block in-app navigation and browser close when form has unsaved changes
  const blocker = useBlocker({
    shouldBlockFn: () => hasUnsavedChanges,
    enableBeforeUnload: () => hasUnsavedChanges,
    withResolver: true,
  });

  useEffect(() => {
    if (blocker.status === 'blocked') {
      Modal.confirm({
        title: 'Unsaved changes',
        content: 'You have unsaved changes. Are you sure you want to leave?',
        okText: 'Leave',
        cancelText: 'Stay',
        onOk: () => blocker.proceed(),
        onCancel: () => blocker.reset(),
      });
    }
  }, [blocker]);

  const handleTabChange = useCallback(
    (key: string) => {
      if (key === 'json' && activeTab === 'form') {
        // Serialize current form values to JSON editor
        const values = form.getValues() as Record<string, unknown>;
        const sanitizedValues = rawData ? stripSystemReadonlyFields(values) : values;
        setJsonStr(JSON.stringify(sanitizedValues, null, 2));
        setJsonTabDirty(false);
        setJsonError(null);
      } else if (key === 'form' && activeTab === 'json') {
        // Parse JSON editor back into form
        try {
          const parsed = JSON.parse(jsonStr || '{}') as Record<string, unknown>;
          const sanitizedParsed = rawData ? stripSystemReadonlyFields(parsed) : parsed;
          form.reset(sanitizedParsed, { keepDefaultValues: true });
          setJsonTabDirty(false);
          setJsonError(null);
        } catch (e) {
          setJsonError('Invalid JSON: ' + String(e));
          return;
        }
      }
      setActiveTab(key);
    },
    [activeTab, form, jsonStr, rawData]
  );

  const handleJsonSubmit = useCallback(async () => {
    setJsonError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr || '{}') as Record<string, unknown>;
      if (rawData) {
        parsed = stripSystemReadonlyFields(parsed);
      }
    } catch (e) {
      setJsonError('Invalid JSON: ' + String(e));
      return;
    }
    // Reset form with parsed values then trigger Zod validation via handleSubmit
    form.reset(parsed, { keepDefaultValues: true });
    setJsonTabDirty(false);
    setIsSubmitting(true);
    try {
      await form.handleSubmit(
        safeSubmit,
        (errors) => {
          const flat = flattenErrors(errors);
          if (flat.length > 0) {
            setJsonError(
              `Validation failed:\n${flat.map((e) => `  ${e.path}: ${e.message}`).join('\n')}`
            );
          }
        }
      )();
    } finally {
      setIsSubmitting(false);
    }
  }, [jsonStr, form, safeSubmit, rawData]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
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
  }, [hasUnsavedChanges, router]);

  const tabItems = [
    {
      key: 'form',
      label: 'Form',
      children: (
        <form
          onSubmit={form.handleSubmit(safeSubmit, (errors) => {
            const firstError = flattenErrors(errors)[0];
            if (firstError) {
              focusFormError(firstError.path);
            }
          })}
        >
          {apiError && (
            <Alert type="error" showIcon closable message={apiError} onClose={() => setApiError(null)} style={{ marginBottom: 16 }} />
          )}
          <FormErrorSummary errors={validationErrors} onFocusError={focusFormError} />
          {children}
          {!disabled && (
            <FormActionBar
              errorCount={validationErrors.length}
              hasUnsavedChanges={hasUnsavedChanges}
              onFocusFirstError={focusFirstFormError}
              onRevert={handleRevert}
            >
              <FormSubmitBtn>{submitLabel}</FormSubmitBtn>
              <Button size="middle" onClick={handleCancel}>
                Cancel
              </Button>
            </FormActionBar>
          )}
        </form>
      ),
    },
  ];

  if (rawData === undefined) {
    tabItems.push({
      key: 'json',
      label: 'JSON',
      children: (
        <div>
          <Alert
            type="info"
            showIcon
            message="Create this resource by editing the same payload that the form will validate and submit."
            style={{ marginBottom: 12 }}
          />
          <div
            style={{
              border: jsonError ? '1px solid var(--ant-color-error)' : '1px solid var(--ant-color-border)',
              borderRadius: 6,
              overflow: 'hidden',
              resize: 'vertical',
              height: 500,
              minHeight: 300,
              maxHeight: 1200,
            }}
          >
            <Editor
              height="100%"
              language="json"
              theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
              value={jsonStr}
              onChange={(val) => {
                setJsonStr(val ?? '');
                setJsonTabDirty(true);
                setJsonError(null);
              }}
              options={{ ...monacoOptions, readOnly: disabled }}
            />
          </div>
          {jsonError && (
            <Alert
              type="error"
              message={<div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>{jsonError}</div>}
              style={{ marginTop: 8 }}
              showIcon
            />
          )}
          {!disabled && (
            <FormActionBar
              errorCount={validationErrors.length}
              hasUnsavedChanges={hasUnsavedChanges}
              onFocusFirstError={focusFirstFormError}
              onRevert={handleRevert}
            >
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
            </FormActionBar>
          )}
        </div>
      ),
    });
  } else {
    tabItems.push({
      key: 'raw',
      label: 'Admin API JSON',
      children: (
        <AdminApiJsonEditor
          api={adminApi ?? ''}
          disabled={disabled || !adminApi}
          height="500px"
          initialData={rawData as Record<string, unknown>}
          onDirtyChange={setRawTabDirty}
          onSaved={async () => {
            await queryClient.invalidateQueries();
          }}
          onSavingChange={setRawTabSaving}
        />
      ),
    });
  }

  const values = form.getValues();
  const isRoute = !!(values && (values.uri !== undefined || values.uris !== undefined || values.methods !== undefined));

  if (isRoute) {
    const curlCommand = generateCurlCommand(values, curlTargetHost);
    tabItems.push({
      key: 'curl',
      label: 'cURL Preview',
      children: (
        <div>
          <Alert
            type="info"
            showIcon
            message="This generated cURL command reflects your current form values. Edit the target host below to match your APISIX data plane address."
            style={{ marginBottom: 12 }}
          />
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text style={{ whiteSpace: 'nowrap', fontSize: 13 }}>Target host:</Typography.Text>
            <Input
              size="small"
              value={curlTargetHost}
              onChange={(e) => {
                const val = e.target.value;
                setCurlTargetHost(val);
                try {
                  localStorage.setItem('apisix-dashboard:curl-target-host', val);
                } catch {
                  // ignore storage quota/security blocks
                }
              }}
              placeholder="localhost:9080"
              style={{ maxWidth: 260, fontFamily: 'monospace' }}
              addonBefore="http://"
            />
          </div>
          <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, padding: 12, background: 'var(--ant-color-fill-quaternary)', position: 'relative' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, color: 'var(--ant-color-text)' }}>
              {curlCommand}
            </pre>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(curlCommand);
                    message.success('cURL command copied to clipboard');
                  } catch {
                    message.error('Failed to copy');
                  }
                }}
              >
                Copy cURL
              </Button>
            </div>
          </div>
        </div>
      ),
    });
  }

  const diffOriginal = rawData ? JSON.stringify(rawData, null, 2) : '{}';
  const diffModified = pendingSubmitRef.current
    ? JSON.stringify(pendingSubmitRef.current, null, 2)
    : '{}';

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
      />
      <Modal
        open={diffModalOpen}
        title="Review Changes Before Saving"
        width={900}
        onCancel={() => { setDiffModalOpen(false); pendingSubmitRef.current = null; }}
        onOk={confirmDiffAndSave}
        okText="Confirm & Save"
        cancelText="Cancel"
      >
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, overflow: 'hidden' }}>
          <DiffEditor
            height="450px"
            language="json"
            theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
            original={diffOriginal}
            modified={diffModified}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              renderSideBySide: true,
              automaticLayout: true,
            }}
          />
        </div>
      </Modal>
    </>
  );
};
