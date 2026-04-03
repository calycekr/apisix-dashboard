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
import { Alert, Button, Drawer, Space } from 'antd';
import { useCallback, useEffect, useState } from 'react';

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

    // Fetch only if no cached data provided
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

  const handlePut = useCallback(async () => {
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
      const body = { ...(parsed as Record<string, unknown>) };
      delete body.id;
      delete body.username;
      await req.put(api, body);
      showNotification({ message: 'Saved successfully (PUT)', type: 'success' });
      queryClient.invalidateQueries();
      onClose();
    } catch (e) {
      setError('Save failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }, [api, value, onClose]);

  const handlePatch = useCallback(async () => {
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
      await req.patch(api, parsed);
      showNotification({ message: 'Saved successfully (PATCH)', type: 'success' });
      queryClient.invalidateQueries();
      onClose();
    } catch (e) {
      setError('Save failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }, [api, value, onClose]);

  const isDirty = value !== original;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      width={640}
      placement="right"
      extra={
        <Space>
          <Button size="small" onClick={() => setValue(original)} disabled={!isDirty}>
            Reset
          </Button>
          <Button
            size="small"
            loading={saving}
            onClick={handlePatch}
            disabled={!isDirty}
            style={{ background: isDirty ? '#52c41a' : undefined, color: isDirty ? '#fff' : undefined }}
          >
            PATCH
          </Button>
          <Button
            size="small"
            type="primary"
            loading={saving}
            onClick={handlePut}
            disabled={!isDirty}
          >
            PUT
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} closable onClose={() => setError(null)} />
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : (
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, overflow: 'hidden' }}>
          <Editor
            height="calc(100vh - 180px)"
            language="json"
            theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
            value={value}
            onChange={(v) => setValue(v ?? '')}
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
