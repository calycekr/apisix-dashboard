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
import { useNavigate } from '@tanstack/react-router';
import { Input, Modal, Spin, Tag, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RESOURCES } from '@/apis/dashboard';
import { SKIP_INTERCEPTOR_HEADER } from '@/config/constant';
import { req } from '@/config/req';
import IconSearch from '~icons/material-symbols/search';

type SearchResult = {
  resourceType: string;
  id: string;
  name?: string;
  detailPath: string;
};

const RESOURCE_COLORS: Record<string, string> = {
  routes: 'blue',
  services: 'green',
  upstreams: 'purple',
  consumers: 'orange',
  ssls: 'magenta',
  streamRoutes: 'cyan',
  consumerGroups: 'geekblue',
  globalRules: 'volcano',
  pluginConfigs: 'lime',
  secrets: 'gold',
  protos: 'default',
};

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  // Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    // Cancel previous search
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const searchResults: SearchResult[] = [];

    const promises = RESOURCES.map(async (r) => {
      try {
        const res = await req.get(r.api, {
          params: { page: 1, page_size: 10, name: q },
          signal: controller.signal,
          headers: { [SKIP_INTERCEPTOR_HEADER]: ['400', '404'] },
        });
        const list = res.data?.list;
        if (!Array.isArray(list)) return;
        for (const item of list) {
          const v = item.value as Record<string, unknown>;
          const id = String(v.id || v.username || '');
          searchResults.push({
            resourceType: r.key,
            id,
            name: String(v.name || v.desc || v.sni || ''),
            detailPath: `${r.detailPrefix}/${id}`,
          });
        }
      } catch {
        // skip failed/cancelled resources
      }
    });

    await Promise.allSettled(promises);

    // Don't update state if this search was cancelled
    if (controller.signal.aborted) return;

    setResults(searchResults.slice(0, 20));
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      navigate({ to: result.detailPath });
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  return (
    <>
      <Input
        prefix={<IconSearch style={{ opacity: 0.45 }} />}
        placeholder="Search... (Ctrl+K)"
        readOnly
        onClick={() => setOpen(true)}
        style={{ width: 200, cursor: 'pointer' }}
        size="small"
      />
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        closable={false}
        width={600}
        styles={{ body: { padding: '12px 0' } }}
      >
        <div style={{ padding: '0 16px 12px' }}>
          <Input
            ref={inputRef as never}
            prefix={<IconSearch />}
            placeholder="Search all resources by name..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            allowClear
            size="large"
            autoFocus
          />
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Typography.Text type="secondary">No results found</Typography.Text>
            </div>
          )}
          {results.map((result, idx) => (
            <div
              key={`${result.resourceType}-${result.id}`}
              onClick={() => handleSelect(result)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: idx === selectedIndex ? 'var(--ant-color-primary-bg)' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <Tag
                color={RESOURCE_COLORS[result.resourceType] ?? 'default'}
                style={{ margin: 0, minWidth: 70, textAlign: 'center' }}
              >
                {result.resourceType}
              </Tag>
              <Typography.Text strong ellipsis style={{ flex: 1 }}>
                {result.name || result.id}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                {result.id}
              </Typography.Text>
            </div>
          ))}
        </div>
        {!loading && (
          <div style={{ padding: '8px 16px 0', borderTop: '1px solid var(--ant-color-border)' }}>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              ↑↓ Navigate · Enter Select · Esc Close
            </Typography.Text>
          </div>
        )}
      </Modal>
    </>
  );
};
