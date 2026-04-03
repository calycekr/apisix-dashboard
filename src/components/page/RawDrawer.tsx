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
import { showNotification } from '@/utils/notification';

type RawDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Full API path, e.g. '/routes/123' */
  api: string;
  title: string;
  /** Pre-loaded data from list cache — avoids re-fetching */
  initialData?: Record<string, unknown>;
};

export const RawDrawer = ({ open, onClose, api, title, initialData }: RawDrawerProps) => {
  const { mode } = useThemeMode();
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'patch' | 'put'>('patch');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!open || !api) return;

    const loadData = (data: Record<string, unknown>) => {
      const copy = { ...data };
      delete copy.create_time;
      delete copy.update_time;
      const json = JSON.stringify(copy, null, 2);
      setValue(json);
      setOriginal(json);
    };

    if (initialData) {
      loadData(initialData);
      return;
    }

    setLoading(true);
    setError(null);
    req
      .get(api)
      .then((res) => {
        const data = res.data?.value;
        if (data) loadData(data);
      })
      .catch(() => setError('Failed to load resource'))
      .finally(() => setLoading(false));
  }, [open, api, initialData]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      setError('Invalid JSON: ' + String(e));
      return;
    }
    setSaving(true);
    try {
      if (saveMode === 'patch') {
        await req.patch(api, parsed);
      } else {
        const body = { ...(parsed as Record<string, unknown>) };
        delete body.id;
        delete body.username;
        await req.put(api, body);
      }
      showNotification({ message: `Saved (${saveMode.toUpperCase()})`, type: 'success' });
      queryClient.invalidateQueries();
      onClose();
    } catch (e) {
      setError('Save failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }, [api, value, saveMode, saving, onClose]);

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
            <Tooltip title="Only send changed fields — other fields untouched">
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
      {isDirty && (
        <Typography.Text type="warning" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Unsaved changes · Ctrl+S to save · {saveMode === 'patch' ? 'PATCH mode (partial update)' : 'PUT mode (full replace)'}
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
            onChange={(v) => setValue(v ?? '')}
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
