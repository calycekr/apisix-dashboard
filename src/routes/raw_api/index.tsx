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
import { Alert, Button, Card, Col, Input, message, Row, Select, Space, Typography } from 'antd';
import { useCallback, useState } from 'react';

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
import { useThemeMode } from '@/stores/global';

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
  { label: 'PUT — Create or replace by ID', value: 'PUT' },
  { label: 'PATCH — Partial update by ID', value: 'PATCH' },
  { label: 'POST — Create with auto-generated ID', value: 'POST' },
  { label: 'GET — Read by ID', value: 'GET' },
  { label: 'DELETE — Delete by ID', value: 'DELETE' },
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

function RawApiPage() {
  const { mode: themeMode } = useThemeMode();
  const [resource, setResource] = useState(API_ROUTES);
  const [method, setMethod] = useState('PUT');
  const [resourceId, setResourceId] = useState('');
  const [body, setBody] = useState(DEFAULT_BODY);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  const needsId = method !== 'POST';
  const needsBody = method !== 'GET' && method !== 'DELETE';
  const endpoint = needsId && resourceId
    ? `${resource}/${resourceId}`
    : resource;

  const handleExecute = useCallback(async () => {
    if (needsId && !resourceId) {
      message.warning('Please enter a resource ID');
      return;
    }

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
  }, [method, endpoint, body, needsId, needsBody, resourceId]);

  return (
    <>
      <PageHeader
        title="Raw API"
        desc="Execute APISIX Admin API requests directly — like curl, but in the browser"
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
                onChange={setResource}
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
              <Input
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder={needsId ? 'Resource ID (required)' : 'ID (auto-generated for POST)'}
                disabled={!needsId}
                style={{ fontFamily: 'monospace' }}
              />
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

          <Typography.Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {method} /apisix/admin{endpoint}
          </Typography.Text>
        </Space>
      </Card>

      {needsBody && (
        <Card title="Request Body" style={{ marginBottom: 16 }}>
          <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, overflow: 'hidden' }}>
            <Editor
              height="300px"
              language="json"
              theme={themeMode === 'dark' ? 'vs-dark' : 'vs-light'}
              value={body}
              onChange={(val) => setBody(val ?? '')}
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
        <Card title="Response">
          <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, overflow: 'hidden' }}>
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
