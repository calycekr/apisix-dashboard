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
import { Alert, Button, Drawer, message, Modal, Radio, Space, Tooltip, Typography } from 'antd';
import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';

import { queryClient } from '@/config/global';
import { req } from '@/config/req';
import { useThemeMode } from '@/stores/global';
import { stripSystemReadonlyFields } from '@/utils/apisixEditable';
import { showNotification } from '@/utils/notification';


const PATCH_RISKY_RESOURCES = new Set(['consumers', 'consumer_groups', 'secrets', 'protos']);

const getResourceName = (path: string) => path.split('/').filter(Boolean)[0] || '';

const isPatchRiskyForApi = (path: string) => PATCH_RISKY_RESOURCES.has(getResourceName(path));

type RawDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  /** Full API path, e.g. '/routes/123' */
  api: string;
  title: string;
  /** Pre-loaded data from list cache — avoids re-fetching */
  initialData?: Record<string, unknown>;
};

const PATCH_READONLY_FIELDS = ['id', 'manager', 'username', 'create_time', 'update_time'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeJson = (data: Record<string, unknown>) =>
  JSON.stringify(data, null, 2);

const toPatchPayload = (
  current: Record<string, unknown>,
  previous: Record<string, unknown>
): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(current), ...Object.keys(previous)]);

  for (const key of keys) {
    if (PATCH_READONLY_FIELDS.includes(key as (typeof PATCH_READONLY_FIELDS)[number])) {
      continue;
    }

    if (!(key in current)) {
      patch[key] = null;
      continue;
    }

    if (!(key in previous)) {
      patch[key] = current[key];
      continue;
    }

    const currentValue = current[key];
    const previousValue = previous[key];

    if (isRecord(currentValue) && isRecord(previousValue)) {
      const nestedPatch = toPatchPayload(currentValue, previousValue);
      if (Object.keys(nestedPatch).length > 0) {
        patch[key] = nestedPatch;
      }
      continue;
    }

    if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
      patch[key] = currentValue;
    }
  }

  return patch;
};

export const RawDrawer = ({ open, onClose, onSaved, api, title, initialData }: RawDrawerProps) => {
  const { mode } = useThemeMode();
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; at: string } | null>(null);
  const [saveMode, setSaveMode] = useState<'patch' | 'put'>('put');
  const patchRisky = isPatchRiskyForApi(api);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const userEditedRef = useRef(false);

  useEffect(() => {
    if (!open || !api) return;

    const loadData = (data: Record<string, unknown>) => {
      const copy = stripSystemReadonlyFields(data);
      const json = JSON.stringify(copy, null, 2);
      setValue(json);
      setOriginal(json);
      setError(null);
      userEditedRef.current = false;
    };

    if (initialData) {
      // Show cached row data immediately, but still fetch latest from API
      loadData(initialData);
    } else {
      setLoading(true);
    }
    setError(null);
    setSaveFeedback(null);
    let cancelled = false;
    req
      .get(api)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.value;
        if (!data) return;

        if (userEditedRef.current) {
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
  }, [open, api, initialData]);


  const handleSave = useCallback(async () => {
    if (saving) return;
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
      setError('Cannot compare against the original resource. Close and reopen this drawer.');
      return;
    }

    const payload =
      saveMode === 'patch'
        ? toPatchPayload(parsed, previous)
        : stripSystemReadonlyFields(parsed);

    if (Object.keys(payload).length === 0) {
      const normalized = normalizeJson(stripSystemReadonlyFields(parsed));
      setOriginal(normalized);
      setValue(normalized);
      message.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const normalizeRaw = (data: Record<string, unknown>) => {
        const copy = stripSystemReadonlyFields(data);
        return JSON.stringify(copy, null, 2);
      };

      const requestBody = payload;
      const saveWithPut = async () => req.put(api, { ...requestBody });
      const saveLabel = saveMode.toUpperCase();

      if (saveMode === 'patch') {
        try {
          await req.patch(api, requestBody);
        } catch (e) {
          const status = (e as { response?: { status?: number } }).response?.status;
          if (status === 405 || status === 501) {
            const unsupportedMsg = 'PATCH is not supported for this resource. Please switch to PUT and retry save.';
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
      } else {
        await saveWithPut();
      }

      let reloaded = false;
      let nextValue = normalizeRaw(parsed);
      try {
        const latest = await req.get(api);
        const latestData = latest.data?.value as Record<string, unknown> | undefined;
        if (latestData) {
          nextValue = normalizeRaw(latestData);
          reloaded = true;
        }
      } catch {
        reloaded = false;
      }

      setValue(nextValue);
      setOriginal(nextValue);
      userEditedRef.current = false;
      const successMsg = `Saved successfully with ${saveLabel}`;
      showNotification({ message: successMsg, type: 'success' });
      setSaveFeedback({
        type: reloaded ? 'success' : 'warning',
        message: reloaded
          ? successMsg
          : `${successMsg}. Latest state could not be reloaded, so the editor kept your saved JSON.`,
        at: new Date().toLocaleTimeString(),
      });
      await queryClient.invalidateQueries();
      await onSaved?.();
    } catch (e) {
      const failureMsg = 'Save failed: ' + (e instanceof Error ? e.message : String(e));
      setError(failureMsg);
      setSaveFeedback({ type: 'error', message: failureMsg, at: new Date().toLocaleTimeString() });
    } finally {
      setSaving(false);
    }
  }, [api, value, original, saveMode, saving, onSaved]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      message.success('Copied to clipboard');
    } catch {
      message.error('Failed to copy to clipboard');
    }
  }, [value]);

  // Dispose Monaco on unmount to prevent memory leak
  useEffect(() => {
    return () => { editorRef.current?.dispose(); };
  }, []);

  // Ctrl+S: use refs to avoid stale closure
  const valueRef = useRef(value);
  const originalRef = useRef(original);
  const handleSaveRef = useRef(handleSave);
  valueRef.current = value;
  originalRef.current = original;
  handleSaveRef.current = handleSave;

  const handleEditorMount = useCallback(
    (ed: editor.IStandaloneCodeEditor) => {
      editorRef.current = ed;
       
      ed.addCommand(2048 | 49, () => {
        if (valueRef.current !== originalRef.current) handleSaveRef.current();
      });
    },
    []
  );

  const isDirty = value !== original;
  const closeDrawer = useCallback(() => {
    if (saving) {
      message.info('Save is still in progress');
      return;
    }

    if (!isDirty) {
      onClose();
      return;
    }

    Modal.confirm({
      title: 'Discard unsaved changes?',
      content: 'Your RAW edits have not been saved.',
      okText: 'Discard',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: onClose,
    });
  }, [isDirty, onClose, saving]);

  return (
    <Drawer
      open={open}
      onClose={closeDrawer}
      title={
        <div>
          <div>{title}</div>
          <Typography.Text type="secondary" copyable style={{ fontSize: 12, fontFamily: 'monospace' }}>
            {api}
          </Typography.Text>
        </div>
      }
      width={700}
      placement="right"
      extra={
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
          <Radio.Group
            size="small"
            value={saveMode}
            onChange={(e) => setSaveMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Tooltip
              title={
                patchRisky
                  ? 'PATCH may be unsupported for this resource in APISIX. It sends only changed fields.'
                  : 'Send only fields that differ from the loaded resource'
              }
            >
              <Radio.Button value="patch">PATCH</Radio.Button>
            </Tooltip>
            <Tooltip title="Replace the resource with the JSON shown below">
              <Radio.Button value="put">PUT</Radio.Button>
            </Tooltip>
          </Radio.Group>
        </Space>
      }
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Text type={isDirty ? 'warning' : 'secondary'}>
            {isDirty
              ? `Unsaved changes. Ctrl+S saves with ${saveMode.toUpperCase()}.`
              : 'Saved'}
          </Typography.Text>
          <Space>
            <Button onClick={closeDrawer}>Close</Button>
            <Button
              type="primary"
              loading={saving}
              onClick={handleSave}
              disabled={!isDirty || loading}
            >
              Save
            </Button>
          </Space>
        </Space>
      }
    >
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
        type={saveMode === 'put' ? 'info' : 'warning'}
        showIcon
        message={
          saveMode === 'put'
            ? 'PUT saves the JSON below as the resource body. Read-only fields are removed before sending.'
            : 'PATCH sends only fields changed from the loaded resource. Removed fields are sent as null.'
        }
        style={{ marginBottom: 12 }}
      />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : (
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, overflow: 'hidden' }}>
          <Editor
            height="calc(100vh - 220px)"
            language="json"
            theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
            value={value}
            onChange={(v) => {
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
            }}
          />
        </div>
      )}
    </Drawer>
  );
};
