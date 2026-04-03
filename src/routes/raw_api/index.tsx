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
import { createFileRoute } from '@tanstack/react-router';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useState } from 'react';

import PageHeader from '@/components/page/PageHeader';
import {
  API_CONSUMER_GROUPS,
  API_CONSUMERS,
  API_GLOBAL_RULES,
  API_PLUGIN_CONFIGS,
  API_PROTOS,
  API_ROUTES,
  API_SECRETS,
  API_SERVICES,
  API_SSLS,
  API_STREAM_ROUTES,
  API_UPSTREAMS,
} from '@/config/constant';
import { req } from '@/config/req';
import { adminKeyAtom, useThemeMode } from '@/stores/global';

const RESOURCE_OPTIONS = [
  { label: 'Routes', value: API_ROUTES },
  { label: 'Services', value: API_SERVICES },
  { label: 'Upstreams', value: API_UPSTREAMS },
  { label: 'Consumers', value: API_CONSUMERS },
  { label: 'Consumer Groups', value: API_CONSUMER_GROUPS },
  { label: 'SSLs', value: API_SSLS },
  { label: 'Stream Routes', value: API_STREAM_ROUTES },
  { label: 'Global Rules', value: API_GLOBAL_RULES },
  { label: 'Plugin Configs', value: API_PLUGIN_CONFIGS },
  { label: 'Protos', value: API_PROTOS },
  { label: 'Secrets', value: API_SECRETS },
];

const METHOD_OPTIONS = [
  { label: 'PUT — Create or full replace (entire body required)', value: 'PUT' },
  { label: 'PATCH — Partial update (only changed fields needed)', value: 'PATCH' },
  { label: 'POST — Create with auto-generated ID', value: 'POST' },
  { label: 'GET — Read resource by ID', value: 'GET' },
  { label: 'DELETE — Delete resource by ID', value: 'DELETE' },
];

const METHOD_COLORS: Record<string, string> = {
  PUT: '#faad14',
  PATCH: '#52c41a',
  POST: '#1677ff',
  GET: '#13c2c2',
  DELETE: '#ff4d4f',
};

const DEFAULT_BODY = `{
  "name": "",
  "desc": ""
}`;

type ExistingResource = { id: string; name?: string };

function useExistingResources(resource: string) {
  const [items, setItems] = useState<ExistingResource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    req
      .get(resource, { params: { page: 1, page_size: 100 } })
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.list;
        if (!Array.isArray(list)) {
          setItems([]);
          return;
        }
        setItems(
          list.map((item: { value: Record<string, unknown> }) => ({
            id: String(item.value.id || item.value.username || ''),
            name: String(item.value.name || item.value.desc || ''),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resource]);

  return { items, loading };
}

function RawApiPage() {
  const { mode: themeMode } = useThemeMode();
  const adminKey = useAtomValue(adminKeyAtom);
  const [resource, setResource] = useState(API_ROUTES);
  const [method, setMethod] = useState('PUT');
  const [resourceId, setResourceId] = useState('');
  const [body, setBody] = useState(DEFAULT_BODY);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  const { items: existingResources, loading: resourcesLoading } =
    useExistingResources(resource);

  const needsId = method !== 'POST';
  const needsBody = method !== 'GET' && method !== 'DELETE';
  const endpoint = needsId && resourceId ? `${resource}/${resourceId}` : resource;

  const handleLoadExisting = useCallback(async () => {
    if (!resourceId) {
      message.warning('Enter an ID to load');
      return;
    }
    setLoadingExisting(true);
    try {
      const res = await req.get(`${resource}/${resourceId}`);
      const value = res.data?.value;
      if (value) {
        const copy = { ...(value as Record<string, unknown>) };
        delete copy.create_time;
        delete copy.update_time;
        setBody(JSON.stringify(copy, null, 2));
        message.success(`Loaded ${resourceId}`);
      } else {
        setBody(JSON.stringify(res.data, null, 2));
      }
    } catch {
      message.error(`Failed to load ${resourceId}`);
    } finally {
      setLoadingExisting(false);
    }
  }, [resource, resourceId]);

  const doExecute = useCallback(async () => {
    let parsedBody: unknown = undefined;
    if (needsBody) {
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        message.error('Invalid JSON body: ' + String(e));
        return;
      }
    }

    setLoading(true);
    setResponse(null);
    setResponseError(null);

    try {
      const res = await req.request({
        method: method.toLowerCase(),
        url: endpoint,
        data: parsedBody,
      });
      setResponse(JSON.stringify(res.data, null, 2));
      message.success(`${method} ${endpoint} — Success`);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setResponseError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [method, endpoint, body, needsBody]);

  const handleExecute = useCallback(() => {
    if (needsId && !resourceId) {
      message.warning('Please enter a resource ID');
      return;
    }

    if (method === 'DELETE') {
      Modal.confirm({
        centered: true,
        okButtonProps: { danger: true },
        title: `DELETE ${endpoint}`,
        content: 'This will permanently delete the resource. Are you sure?',
        okText: 'Delete',
        onOk: doExecute,
      });
    } else if (method === 'PUT' && resourceId) {
      Modal.confirm({
        centered: true,
        title: `PUT ${endpoint}`,
        content: 'PUT replaces the entire resource. Omitted fields will be removed. Continue?',
        okText: 'Execute',
        onOk: doExecute,
      });
    } else {
      doExecute();
    }
  }, [method, endpoint, needsId, resourceId, doExecute]);

  const autocompleteOptions = existingResources.map((r) => ({
    value: r.id,
    label: (
      <span>
        <Typography.Text code style={{ fontSize: 12 }}>
          {r.id}
        </Typography.Text>
        {r.name && (
          <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            {r.name}
          </Typography.Text>
        )}
      </span>
    ),
  }));

  return (
    <>
      <PageHeader
        title="Raw API"
        desc="Execute APISIX Admin API requests directly — select an existing resource or create new ones"
      />

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={12} align="middle">
            <Col flex="160px">
              <Select
                value={method}
                onChange={setMethod}
                options={METHOD_OPTIONS}
                style={{ width: '100%' }}
                labelRender={({ value }) => (
                  <span style={{ color: METHOD_COLORS[value as string], fontWeight: 600 }}>
                    {value as string}
                  </span>
                )}
              />
            </Col>
            <Col flex="200px">
              <Select
                value={resource}
                onChange={(v) => {
                  setResource(v);
                  setResourceId('');
                  setResponse(null);
                  setResponseError(null);
                }}
                options={RESOURCE_OPTIONS}
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="label"
              />
            </Col>
            <Col>
              <Typography.Text type="secondary">/</Typography.Text>
            </Col>
            <Col flex="auto">
              <AutoComplete
                value={resourceId}
                onChange={setResourceId}
                options={autocompleteOptions}
                placeholder={needsId ? 'Resource ID (type or select from list)' : 'ID (auto-generated for POST)'}
                disabled={!needsId}
                style={{ width: '100%', fontFamily: 'monospace' }}
                filterOption={(input, option) =>
                  !!option?.value?.toString().toLowerCase().includes(input.toLowerCase())
                }
                notFoundContent={resourcesLoading ? <Spin size="small" /> : null}
              />
            </Col>
            <Col>
              <Button
                loading={loadingExisting}
                disabled={!resourceId}
                onClick={handleLoadExisting}
              >
                Load
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                loading={loading}
                onClick={handleExecute}
                style={{ background: METHOD_COLORS[method] }}
              >
                Execute
              </Button>
            </Col>
          </Row>

          <div>
            <Typography.Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {method} /apisix/admin{endpoint}
            </Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {method === 'PUT' && 'PUT replaces the entire resource. All fields must be provided — omitted fields will be removed.'}
              {method === 'PATCH' && 'PATCH updates only the specified fields. Omitted fields are left unchanged.'}
              {method === 'POST' && 'POST creates a new resource with an auto-generated ID. The body defines the configuration.'}
              {method === 'GET' && 'GET retrieves the resource. No request body needed.'}
              {method === 'DELETE' && 'DELETE removes the resource permanently. No request body needed.'}
            </Typography.Text>
          </div>
          <Button
            size="small"
            type="text"
            onClick={async () => {
              if (!adminKey?.trim()) {
                message.warning('Admin Key required for curl command');
                return;
              }
              // Use current browser origin for the API URL
              const baseUrl = `${window.location.origin}/apisix/admin`;
              const lines = [
                `curl -i -X ${method} '${baseUrl}${endpoint}'`,
                `  -H 'X-API-KEY: ${adminKey}'`,
              ];
              if (needsBody && body.trim()) {
                lines.push('  -H \'Content-Type: application/json\'');
                lines.push(`  -d '${body.replace(/'/g, "'\\''").replace(/\n\s*/g, ' ').trim()}'`);
              }
              try {
                await navigator.clipboard.writeText(lines.join(' \\\n'));
                message.success('Copied as curl');
              } catch {
                message.error('Failed to copy');
              }
            }}
          >
            Copy as curl
          </Button>
        </Space>
      </Card>

      {needsBody && (
        <Card title="Request Body" style={{ marginBottom: 16 }}>
          <div
            style={{
              border: '1px solid var(--ant-color-border)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <Editor
              height="300px"
              language="json"
              theme={themeMode === 'dark' ? 'vs-dark' : 'vs-light'}
              value={body}
              onChange={(val) => setBody(val ?? '')}
              beforeMount={(monaco) => {
                monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                  validate: true,
                  schemaValidation: 'ignore',
                  enableSchemaRequest: false,
                });
              }}
              options={{
                minimap: { enabled: false },
                automaticLayout: true,
                lineNumbers: 'on',
                contextmenu: false,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'none',
                tabSize: 2,
              }}
            />
          </div>
        </Card>
      )}

      {responseError && (
        <Alert
          type="error"
          showIcon
          message="Request Failed"
          description={responseError}
          style={{ marginBottom: 16 }}
        />
      )}

      {response && (
        <Card
          title="Response"
          extra={
            <Button size="small" onClick={() => { navigator.clipboard.writeText(response); message.success('Response copied'); }}>
              Copy
            </Button>
          }
        >
          <div
            style={{
              border: '1px solid var(--ant-color-border)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <Editor
              height="400px"
              language="json"
              theme={themeMode === 'dark' ? 'vs-dark' : 'vs-light'}
              value={response}
              options={{
                minimap: { enabled: false },
                automaticLayout: true,
                readOnly: true,
                lineNumbers: 'on',
                contextmenu: false,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'none',
              }}
            />
          </div>
        </Card>
      )}
    </>
  );
}

export const Route = createFileRoute('/raw_api/')({
  component: RawApiPage,
});
