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
  Tag,
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
  API_PLUGIN_METADATA,
  API_PLUGINS,
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
  { label: 'Plugin Metadata', value: API_PLUGIN_METADATA },
  { label: 'Plugins', value: API_PLUGINS },
  { label: 'Protos', value: API_PROTOS },
  { label: 'Secrets', value: API_SECRETS },
];

const METHODS = ['PUT', 'PATCH', 'GET', 'POST', 'DELETE'] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: '#13c2c2',
  PUT: '#faad14',
  PATCH: '#52c41a',
  POST: '#1677ff',
  DELETE: '#ff4d4f',
};

const METHOD_HINTS: Record<string, string> = {
  GET: 'Read collection, resource, or subpath',
  PUT: 'Send body as full replace/update',
  PATCH: 'Send body as partial update',
  POST: 'Send body to collection or subpath',
  DELETE: 'Delete the target path',
};

const DEFAULT_BODY = `{
  "name": "",
  "desc": ""
}`;

type ExistingResource = { path: string; name?: string };

const getResourcePath = (value: Record<string, unknown>, resource: string) => {
  if (resource === API_SECRETS) {
    const manager = value.manager ? String(value.manager) : '';
    const id = value.id ? String(value.id) : '';
    return manager && id ? `${manager}/${id}` : id;
  }

  return String(value.id || value.username || '');
};

const stringifyResponseData = (data: unknown) => {
  if (data === undefined) return '';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const getErrorResponse = (error: unknown, elapsed: number) => {
  const response = (error as { response?: { status?: number; data?: unknown } }).response;
  if (response) {
    return {
      status: response.status ?? 0,
      data: stringifyResponseData(response.data),
      error: typeof response.data === 'string'
        ? response.data
        : error instanceof Error ? error.message : String(error),
      time: elapsed,
    };
  }

  return {
    status: 0,
    data: '',
    error: error instanceof Error ? error.message : String(error),
    time: elapsed,
  };
};

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
        if (!Array.isArray(list)) { setItems([]); return; }
        setItems(
          list
            .map((item: { value: Record<string, unknown> }) => ({
              path: getResourcePath(item.value, resource),
              name: String(item.value.name || item.value.desc || ''),
            }))
            .filter((item) => item.path)
        );
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resource]);

  return { items, loading };
}

function RawApiPage() {
  const { mode: themeMode } = useThemeMode();
  const adminKey = useAtomValue(adminKeyAtom);
  const [resource, setResource] = useState(API_ROUTES);
  const [method, setMethod] = useState<string>('GET');
  const [pathSuffix, setPathSuffix] = useState('');
  const [body, setBody] = useState(DEFAULT_BODY);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [response, setResponse] = useState<{ status: number; data: string; time: number } | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  const { items: existingResources, loading: resourcesLoading } = useExistingResources(resource);

  const needsBody = method !== 'GET' && method !== 'DELETE';
  const normalizedPathSuffix = pathSuffix.trim().replace(/^\/+|\/+$/g, '');
  const endpoint = normalizedPathSuffix ? `${resource}/${normalizedPathSuffix}` : resource;

  const handleLoadExisting = useCallback(async () => {
    if (!normalizedPathSuffix) { message.warning('Enter a path suffix to load'); return; }
    setLoadingExisting(true);
    setResponse(null);
    setResponseError(null);
    const start = performance.now();
    try {
      const res = await req.get(endpoint);
      const value = res.data?.value ?? res.data;
      setBody(JSON.stringify(value, null, 2));
      setResponse({
        status: res.status,
        data: stringifyResponseData(res.data),
        time: Math.round(performance.now() - start),
      });
      message.success(`Loaded ${normalizedPathSuffix}`);
    } catch (e) {
      const failure = getErrorResponse(e, Math.round(performance.now() - start));
      setResponseError(failure.error);
      setResponse({ status: failure.status, data: failure.data, time: failure.time });
      message.error(`Failed to load ${normalizedPathSuffix}`);
    } finally {
      setLoadingExisting(false);
    }
  }, [endpoint, normalizedPathSuffix]);

  const doExecute = useCallback(async () => {
    let parsedBody: unknown = undefined;
    if (needsBody) {
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        message.error('Invalid JSON: ' + String(e));
        return;
      }
    }
    setLoading(true);
    setResponse(null);
    setResponseError(null);
    const start = performance.now();
    try {
      const res = await req.request({ method: method.toLowerCase(), url: endpoint, data: parsedBody });
      setResponse({
        status: res.status,
        data: stringifyResponseData(res.data),
        time: Math.round(performance.now() - start),
      });
    } catch (e) {
      const failure = getErrorResponse(e, Math.round(performance.now() - start));
      setResponseError(failure.error);
      setResponse({ status: failure.status, data: failure.data, time: failure.time });
    } finally {
      setLoading(false);
    }
  }, [method, endpoint, body, needsBody]);

  const handleExecute = useCallback(() => {
    if (method === 'DELETE') {
      Modal.confirm({
        centered: true, okButtonProps: { danger: true },
        title: `DELETE ${endpoint}`,
        content: 'This will permanently delete the resource.',
        okText: 'Delete', onOk: doExecute,
      });
    } else if (method === 'PUT') {
      Modal.confirm({
        centered: true, title: `PUT ${endpoint}`,
        content: 'PUT replaces the entire resource. Omitted fields will be removed.',
        okText: 'Execute', onOk: doExecute,
      });
    } else {
      doExecute();
    }
  }, [method, endpoint, doExecute]);

  const handleCopyCurl = useCallback(async () => {
    if (!adminKey?.trim()) { message.warning('Admin Key required'); return; }
    const masked = adminKey.length > 4
      ? adminKey.slice(0, 2) + '*'.repeat(adminKey.length - 4) + adminKey.slice(-2)
      : '****';
    const baseUrl = `${window.location.origin}/apisix/admin`;
    const lines = [`curl -i -X ${method} '${baseUrl}${endpoint}'`, `  -H 'X-API-KEY: ${masked}'`];
    if (needsBody && body.trim()) {
      lines.push("  -H 'Content-Type: application/json'");
      lines.push(`  -d '${body.replace(/'/g, "'\\''").replace(/\n\s*/g, ' ').trim()}'`);
    }
    try {
      await navigator.clipboard.writeText(lines.join(' \\\n'));
      message.success('Copied as curl (Admin Key masked — replace the masked value with your key)');
    } catch { message.error('Failed to copy'); }
  }, [method, endpoint, body, needsBody, adminKey]);

  const editorHeight = 'calc(100vh - 340px)';
  const statusColor = response ? (response.status < 300 ? 'success' : response.status < 400 ? 'warning' : 'error') : undefined;

  return (
    <>
      <PageHeader title="API Console" desc="Advanced APISIX Admin API console for direct HTTP requests" />

      <Alert
        type="warning"
        showIcon
        message="Advanced console"
        description="This page sends the selected method and JSON body as-is to the Admin API path. For guided resource JSON editing, use the RAW button in resource tables."
        style={{ marginBottom: 12 }}
      />

      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={8} align="middle">
          <Col>
            <Select
              value={method}
              onChange={setMethod}
              style={{ width: 110 }}
              labelRender={({ value }) => (
                <span style={{ color: METHOD_COLORS[value as string], fontWeight: 700 }}>
                  {value as string}
                </span>
              )}
              options={METHODS.map((m) => ({ value: m, label: m }))}
            />
          </Col>
          <Col flex="180px">
            <Select
              value={resource}
              onChange={(v) => { setResource(v); setPathSuffix(''); setResponse(null); setResponseError(null); }}
              options={RESOURCE_OPTIONS}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col>
            <Typography.Text type="secondary" style={{ fontSize: 16 }}>/</Typography.Text>
          </Col>
          <Col flex="auto">
            <AutoComplete
              value={pathSuffix}
              onChange={setPathSuffix}
              options={existingResources.map((r) => ({
                value: r.path,
                label: <span><Typography.Text code style={{ fontSize: 12 }}>{r.path}</Typography.Text>{r.name && <Typography.Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>{r.name}</Typography.Text>}</span>,
              }))}
              placeholder="Optional path suffix, e.g. id or manager/id"
              style={{ width: '100%', fontFamily: 'monospace' }}
              filterOption={(input, option) => !!option?.value?.toString().toLowerCase().includes(input.toLowerCase())}
              notFoundContent={resourcesLoading ? <Spin size="small" /> : null}
            />
          </Col>
          <Col>
            <Button loading={loadingExisting} disabled={!normalizedPathSuffix} onClick={handleLoadExisting}>
              Load
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              loading={loading}
              onClick={handleExecute}
              style={{ background: METHOD_COLORS[method], minWidth: 90 }}
            >
              {method}
            </Button>
          </Col>
        </Row>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Space size={8}>
            <Typography.Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {method} /apisix/admin{endpoint}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              — {METHOD_HINTS[method]}
            </Typography.Text>
          </Space>
          <Button size="small" type="text" onClick={handleCopyCurl}>
            Copy as curl
          </Button>
        </div>
      </Card>

      <Row gutter={12} style={{ height: editorHeight }}>
        <Col span={needsBody ? 12 : 0} style={{ height: '100%' }}>
          {needsBody && (
            <Card
              size="small"
              title="Request Body"
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              styles={{ body: { flex: 1, padding: 0, overflow: 'hidden' } }}
            >
              <Editor
                height="100%"
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
                  tabSize: 2,
                  renderLineHighlight: 'none',
                }}
              />
            </Card>
          )}
        </Col>

        <Col span={needsBody ? 12 : 24} style={{ height: '100%' }}>
          <Card
            size="small"
            title={
              <Space>
                <span>Response</span>
                {response && statusColor && (
                  <Tag color={statusColor}>{response.status || 'Error'}</Tag>
                )}
                {response && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{response.time}ms</Typography.Text>
                )}
              </Space>
            }
            extra={response?.data && (
              <Button size="small" type="text" onClick={async () => {
                try { await navigator.clipboard.writeText(response.data); message.success('Copied'); }
                catch { message.error('Failed'); }
              }}>Copy</Button>
            )}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, padding: 0, overflow: 'hidden' } }}
          >
            {responseError && !response?.data && (
              <div style={{ padding: 16 }}>
                <Typography.Text type="danger">{responseError}</Typography.Text>
              </div>
            )}
            {response?.data ? (
              <Editor
                height="100%"
                language="json"
                theme={themeMode === 'dark' ? 'vs-dark' : 'vs-light'}
                value={response.data}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  lineNumbers: 'on',
                  renderLineHighlight: 'none',
                }}
              />
            ) : !responseError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                <Typography.Text type="secondary">Execute a request to see the response</Typography.Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}

export const Route = createFileRoute('/raw_api/')({
  component: RawApiPage,
});
