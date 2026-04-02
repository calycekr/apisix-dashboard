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
import { Button, Card, Col, Input, Row, Select, Space, Tag, Typography } from 'antd';
import axios from 'axios';
import { useCallback, useState } from 'react';

import { useThemeMode } from '@/stores/global';

type ApiTestPanelProps = {
  defaultUri?: string;
  defaultHost?: string;
  defaultMethod?: string;
};

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const ApiTestPanel = ({ defaultUri = '/', defaultHost, defaultMethod = 'GET' }: ApiTestPanelProps) => {
  const { mode } = useThemeMode();
  const [method, setMethod] = useState(defaultMethod);
  const [uri, setUri] = useState(defaultUri);
  const [host, setHost] = useState(defaultHost || window.location.hostname);
  const [port, setPort] = useState('9080');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: string;
    time: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    setError(null);

    const parsedHeaders: Record<string, string> = {};
    if (headers.trim()) {
      for (const line of headers.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) {
          parsedHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
      }
    }
    if (host) parsedHeaders['Host'] = host;

    let requestBody: unknown = undefined;
    if (body.trim() && !['GET', 'HEAD', 'DELETE'].includes(method)) {
      try {
        requestBody = JSON.parse(body);
      } catch {
        requestBody = body;
      }
    }

    const url = `http://${window.location.hostname}:${port}${uri}`;
    const start = performance.now();

    try {
      const res = await axios.request({
        method: method.toLowerCase(),
        url,
        headers: parsedHeaders,
        data: requestBody,
        validateStatus: () => true,
        timeout: 30000,
      });
      const time = Math.round(performance.now() - start);
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: res.headers as Record<string, string>,
        data: typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2),
        time,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [method, uri, host, port, headers, body]);

  const statusColor = response
    ? response.status < 300 ? 'success' : response.status < 400 ? 'warning' : 'error'
    : undefined;

  return (
    <Card title="API Test" size="small" style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Row gutter={8} align="middle">
          <Col flex="100px">
            <Select value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: m }))} style={{ width: '100%' }} />
          </Col>
          <Col flex="auto">
            <Input
              addonBefore={`http://${window.location.hostname}:${port}`}
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="/api/endpoint"
            />
          </Col>
          <Col>
            <Input value={port} onChange={(e) => setPort(e.target.value)} style={{ width: 70 }} placeholder="Port" />
          </Col>
          <Col>
            <Button type="primary" loading={loading} onClick={handleSend}>
              Send
            </Button>
          </Col>
        </Row>
        <Input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          addonBefore="Host"
          placeholder="api.example.com"
        />
        <Input.TextArea
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          placeholder={'Additional headers (one per line):\nAuthorization: Bearer token\nContent-Type: application/json'}
          rows={2}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
        {!['GET', 'HEAD', 'DELETE'].includes(method) && (
          <Input.TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='Request body (JSON)'
            rows={3}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        )}
      </Space>

      {error && (
        <Typography.Text type="danger" style={{ display: 'block', marginTop: 12 }}>
          {error}
        </Typography.Text>
      )}

      {response && (
        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 8 }}>
            <Tag color={statusColor}>{response.status} {response.statusText}</Tag>
            <Typography.Text type="secondary">{response.time}ms</Typography.Text>
          </Space>
          <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, overflow: 'hidden' }}>
            <Editor
              height="250px"
              language="json"
              theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
              value={response.data}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                automaticLayout: true,
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};
