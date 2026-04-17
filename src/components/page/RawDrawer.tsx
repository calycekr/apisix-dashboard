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
import { Alert, Button, Drawer, message, Radio, Space, Tooltip, Typography } from 'antd';
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

export const RawDrawer = ({ open, onClose, onSaved, api, title, initialData }: RawDrawerProps) => {
  const { mode } = useThemeMode();
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string; at: string } | null>(null);
  const [saveMode, setSaveMode] = useState<'patch' | 'put'>('patch');
  const patchRisky = isPatchRiskyForApi(api);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!open || !api) return;

    const loadData = (data: Record<string, unknown>) => {
      const copy = stripSystemReadonlyFields(data);
      const json = JSON.stringify(copy, null, 2);
      setValue(json);
      setOriginal(json);
    };

    if (initialData) {
      // Show cached row data immediately, but still fetch latest from API
      loadData(initialData);
    } else {
      setLoading(true);
    }
    setError(null);
    setSaveFeedback(null);
    req
      .get(api)
      .then((res) => {
        const data = res.data?.value;
        if (data) loadData(data);
      })
      .catch(() => {
        if (!initialData) setError('Failed to load resource');
      })
      .finally(() => setLoading(false));
  }, [open, api, initialData]);


  const handleSave = useCallback(async () => {
    if (saving) return;
    setError(null);
    setSaveFeedback(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      setError('Invalid JSON: ' + String(e));
      return;
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setError('Invalid payload: top-level JSON must be an object');
      return;
    }

    setSaving(true);
    try {
      const normalizeRaw = (data: Record<string, unknown>) => {
        const copy = stripSystemReadonlyFields(data);
        return JSON.stringify(copy, null, 2);
      };

      const requestBody = stripSystemReadonlyFields(parsed as Record<string, unknown>);
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

      const latest = await req.get(api);
      const latestData = latest.data?.value as Record<string, unknown> | undefined;
      if (latestData) {
        const latestJson = normalizeRaw(latestData);
        setValue(latestJson);
        setOriginal(latestJson);
      }
      const successMsg = `Saved successfully with ${saveLabel}`;
      showNotification({ message: successMsg, type: 'success' });
      setSaveFeedback({ type: 'success', message: successMsg, at: new Date().toLocaleTimeString() });
      await queryClient.invalidateQueries();
      await onSaved?.();
    } catch (e) {
      const failureMsg = 'Save failed: ' + (e instanceof Error ? e.message : String(e));
      setError(failureMsg);
      setSaveFeedback({ type: 'error', message: failureMsg, at: new Date().toLocaleTimeString() });
    } finally {
      setSaving(false);
    }
  }, [api, value, saveMode, saving, onSaved]);

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

  return (
    <Drawer
      open={open}
      onClose={onClose}
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
          <Button size="small" onClick={() => setValue(original)} disabled={!isDirty}>
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
                  ? 'PATCH may be unsupported for this resource in APISIX. If save fails, switch to PUT.'
                  : 'Only send changed fields — other fields untouched'
              }
            >
              <Radio.Button value="patch">PATCH</Radio.Button>
            </Tooltip>
            <Tooltip title="Replace entire resource — omitted fields removed">
              <Radio.Button value="put">PUT</Radio.Button>
            </Tooltip>
          </Radio.Group>
          <Button
            size="small"
            type="primary"
            loading={saving}
            onClick={handleSave}
            disabled={!isDirty}
          >
            Save
          </Button>
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
      {isDirty && (
        <Typography.Text type="warning" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Unsaved changes · Ctrl+S to save · {saveMode === 'patch' ? 'PATCH mode (partial update)' : 'PUT mode (full replace)'}
        </Typography.Text>
      )}
      {saveMode === 'patch' && patchRisky && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          This resource may reject PATCH in APISIX. If that happens, switch to PUT manually.
        </Typography.Text>
      )}
      {saveFeedback?.type === 'success' && (
        <Typography.Text type="success" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Last successful save: {saveFeedback.at}
        </Typography.Text>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : (
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, overflow: 'hidden' }}>
          <Editor
            height="calc(100vh - 220px)"
            language="json"
            theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
            value={value}
            onChange={(v) => { setValue(v ?? ''); setSaveFeedback(null); }}
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
