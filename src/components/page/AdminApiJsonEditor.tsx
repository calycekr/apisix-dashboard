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
import { Alert, Button, message, Space, Tooltip, Typography } from 'antd';
import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';

import { queryClient } from '@/config/global';
import { req } from '@/config/req';
import { useThemeMode } from '@/stores/global';
import { buildPatchPayload, getChangedTopLevelReadonlyKeys, isRecord } from '@/utils/apisixEditable';
import { showNotification } from '@/utils/notification';

type SaveFeedback = {
  type: 'success' | 'error' | 'warning';
  message: string;
  at: string;
};

export type AdminApiJsonEditorProps = {
  api: string;
  active?: boolean;
  disabled?: boolean;
  autoFetch?: boolean;
  height?: string;
  initialData?: Record<string, unknown>;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: () => void | Promise<void>;
  onSavingChange?: (saving: boolean) => void;
};

const toJson = (data: Record<string, unknown>) => JSON.stringify(data, null, 2);

const getAdminApiErrorMessage = (error: unknown) => {
  const responseData = (error as { response?: { data?: unknown } }).response?.data;
  if (responseData !== undefined) {
    if (typeof responseData === 'string') return responseData;
    try {
      return JSON.stringify(responseData, null, 2);
    } catch {
      return String(responseData);
    }
  }

  return error instanceof Error ? error.message : String(error);
};

export const AdminApiJsonEditor = ({
  api,
  active = true,
  disabled = false,
  autoFetch = false,
  height = '500px',
  initialData,
  onDirtyChange,
  onSaved,
  onSavingChange,
}: AdminApiJsonEditorProps) => {
  const { mode } = useThemeMode();
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const userEditedRef = useRef(false);
  const valueRef = useRef(value);
  const originalRef = useRef(original);
  const saveRef = useRef<() => Promise<void>>(async () => {});

  valueRef.current = value;
  originalRef.current = original;

  const isDirty = value !== original;

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(saving);
    return () => onSavingChange?.(false);
  }, [onSavingChange, saving]);

  const loadData = useCallback((data: Record<string, unknown>) => {
    const json = toJson(data);
    setValue(json);
    setOriginal(json);
    setError(null);
    userEditedRef.current = false;
  }, []);

  useEffect(() => {
    if (!active || !api) return;

    if (initialData) {
      if (userEditedRef.current && valueRef.current !== originalRef.current) {
        setSaveFeedback({
          type: 'warning',
          message: 'Latest API data arrived after editing started, so the editor was not overwritten.',
          at: new Date().toLocaleTimeString(),
        });
      } else {
        loadData(initialData);
      }
    }

    if (!autoFetch) return;

    if (!initialData) {
      setLoading(true);
    }
    setError(null);
    setSaveFeedback(null);
    let cancelled = false;

    req
      .get(api)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.value as Record<string, unknown> | undefined;
        if (!data) return;

        if (userEditedRef.current && valueRef.current !== originalRef.current) {
          setSaveFeedback({
            type: 'warning',
            message: 'Latest API data arrived after editing started, so the editor was not overwritten.',
            at: new Date().toLocaleTimeString(),
          });
          return;
        }

        loadData(data);
      })
      .catch(() => {
        if (cancelled) return;
        if (!initialData) setError('Failed to load resource');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, api, autoFetch, initialData, loadData]);

  const handleSave = useCallback(async () => {
    if (saving || disabled) return;
    setError(null);
    setSaveFeedback(null);

    let parsed: unknown;
    let previous: unknown;
    try {
      parsed = JSON.parse(value);
      previous = JSON.parse(original || '{}');
    } catch (e) {
      setError('Invalid JSON: ' + String(e));
      return;
    }

    if (!isRecord(parsed)) {
      setError('Invalid payload: top-level JSON must be an object');
      return;
    }

    if (!isRecord(previous)) {
      setError('Cannot compare against the original resource. Reload and try again.');
      return;
    }

    const payload = buildPatchPayload(parsed, previous);
    const skippedReadonlyKeys = getChangedTopLevelReadonlyKeys(parsed, previous);

    if (Object.keys(payload).length === 0) {
      setValue(original);
      userEditedRef.current = false;
      const noChangesMessage = skippedReadonlyKeys.length > 0
        ? `Only read-only fields changed (${skippedReadonlyKeys.join(', ')}). They were not sent.`
        : 'No changed fields to save.';
      setSaveFeedback({
        type: 'warning',
        message: noChangesMessage,
        at: new Date().toLocaleTimeString(),
      });
      message.info(noChangesMessage);
      return;
    }

    setSaving(true);
    try {
      try {
        await req.patch(api, payload);
      } catch (e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 405 || status === 501) {
          const unsupportedMsg = 'Direct Admin API PATCH is not supported for this resource.';
          setError(unsupportedMsg);
          setSaveFeedback({
            type: 'error',
            message: unsupportedMsg,
            at: new Date().toLocaleTimeString(),
          });
          return;
        }
        throw e;
      }

      let reloaded = false;
      let nextValue = toJson(parsed);
      try {
        const latest = await req.get(api);
        const latestData = latest.data?.value as Record<string, unknown> | undefined;
        if (latestData) {
          nextValue = toJson(latestData);
          reloaded = true;
        }
      } catch {
        reloaded = false;
      }

      setValue(nextValue);
      setOriginal(nextValue);
      userEditedRef.current = false;
      const successMsg = 'Saved changed fields to Admin API JSON';
      showNotification({ message: successMsg, type: 'success' });
      setSaveFeedback({
        type: reloaded && skippedReadonlyKeys.length === 0 ? 'success' : 'warning',
        message: reloaded
          ? skippedReadonlyKeys.length > 0
            ? `${successMsg}. Read-only fields were skipped: ${skippedReadonlyKeys.join(', ')}.`
            : successMsg
          : `${successMsg}. Latest state could not be reloaded, so the editor kept your saved JSON.`,
        at: new Date().toLocaleTimeString(),
      });
      await queryClient.invalidateQueries();
      await onSaved?.();
    } catch (e) {
      const failureMsg = 'Save failed: ' + getAdminApiErrorMessage(e);
      setError(failureMsg);
      setSaveFeedback({ type: 'error', message: failureMsg, at: new Date().toLocaleTimeString() });
    } finally {
      setSaving(false);
    }
  }, [api, disabled, onSaved, original, saving, value]);

  saveRef.current = handleSave;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      message.success('Copied to clipboard');
    } catch {
      message.error('Failed to copy to clipboard');
    }
  }, [value]);

  const handleEditorMount = useCallback((ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed;
    window.__monacoEditor__ = ed;

    ed.addCommand(2048 | 49, () => {
      if (valueRef.current !== originalRef.current) saveRef.current();
    });
  }, []);

  useEffect(() => {
    return () => {
      editorRef.current?.dispose();
    };
  }, []);

  return (
    <div>
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} closable onClose={() => setError(null)} />
      )}
      {saveFeedback && (
        <Alert
          type={saveFeedback.type}
          showIcon
          message={saveFeedback.message}
          description={`Time: ${saveFeedback.at}`}
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setSaveFeedback(null)}
        />
      )}
      <Alert
        type="info"
        showIcon
        message="Edit the Admin API JSON below. Save sends only changed fields with PATCH and skips top-level read-only fields."
        style={{ marginBottom: 12 }}
      />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : (
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, overflow: 'hidden' }}>
          <Editor
            height={height}
            language="json"
            theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
            value={value}
            onChange={(v) => {
              if (disabled) return;
              userEditedRef.current = true;
              setValue(v ?? '');
              setSaveFeedback(null);
            }}
            onMount={handleEditorMount}
            beforeMount={(monaco) => {
              monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                allowComments: false,
                schemaValidation: 'ignore',
                enableSchemaRequest: false,
              });
            }}
            options={{
              minimap: { enabled: false },
              automaticLayout: true,
              lineNumbers: 'on',
              contextmenu: false,
              tabSize: 2,
              readOnly: disabled,
            }}
          />
        </div>
      )}
      {!disabled && (
        <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 12 }}>
          <Typography.Text type={isDirty ? 'warning' : 'secondary'}>
            {isDirty ? 'Unsaved changes. Ctrl+S saves changed fields.' : 'Saved'}
          </Typography.Text>
          <Space>
            <Tooltip title="Copy JSON">
              <Button size="small" onClick={handleCopy}>Copy</Button>
            </Tooltip>
            <Button
              size="small"
              onClick={() => {
                userEditedRef.current = false;
                setValue(original);
              }}
              disabled={!isDirty}
            >
              Reset
            </Button>
            <Button
              type="primary"
              loading={saving}
              onClick={handleSave}
              disabled={!isDirty || loading}
            >
              Save Changes
            </Button>
          </Space>
        </Space>
      )}
    </div>
  );
};
