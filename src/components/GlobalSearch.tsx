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
import { PAGE_SIZE_MAX, SKIP_INTERCEPTOR_HEADER } from '@/config/constant';
import { req } from '@/config/req';
import IconSearch from '~icons/material-symbols/search';

import classes from './GlobalSearch.module.css';

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

const SEARCHABLE_FIELDS = [
  'id',
  'username',
  'name',
  'desc',
  'sni',
  'snis',
  'uri',
  'uris',
  'host',
  'hosts',
  'service_id',
  'upstream_id',
  'plugin_config_id',
  'manager',
] as const;

const appendSearchValue = (values: string[], value: unknown) => {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendSearchValue(values, item));
    return;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      values.push(key);
      appendSearchValue(values, item);
    });
    return;
  }
  values.push(String(value));
};

const resourceMatchesQuery = (value: Record<string, unknown>, query: string) => {
  const values: string[] = [];
  SEARCHABLE_FIELDS.forEach((field) => appendSearchValue(values, value[field]));
  appendSearchValue(values, value.labels);
  return values.join(' ').toLowerCase().includes(query);
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
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setLoading(false);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const normalizedQuery = q.trim().toLowerCase();

    if (!normalizedQuery) {
      setResults([]);
      setSelectedIndex(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const searchResults: SearchResult[] = [];

    const promises = RESOURCES.map(async (r) => {
      try {
        const res = await req.get(r.api, {
          params: { page: 1, page_size: PAGE_SIZE_MAX },
          signal: controller.signal,
          headers: { [SKIP_INTERCEPTOR_HEADER]: ['400', '404'] },
        });
        const list = Array.isArray(res.data?.list) ? [...res.data.list] : [];
        const totalPages = Math.ceil((res.data?.total ?? 0) / PAGE_SIZE_MAX);
        if (totalPages > 1) {
          const rest = await Promise.allSettled(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              req.get(r.api, {
                params: { page: index + 2, page_size: PAGE_SIZE_MAX },
                signal: controller.signal,
                headers: { [SKIP_INTERCEPTOR_HEADER]: ['400', '404'] },
              })
            )
          );
          rest.forEach((page) => {
            if (
              page.status === 'fulfilled' &&
              Array.isArray(page.value.data?.list)
            ) {
              list.push(...page.value.data.list);
            }
          });
        }
        for (const item of list) {
          const v = item.value as Record<string, unknown>;
          if (!resourceMatchesQuery(v, normalizedQuery)) continue;
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
        className={classes.trigger}
        prefix={<IconSearch />}
        placeholder="Search resources"
        suffix={<kbd className={classes.shortcut}>Ctrl K</kbd>}
        readOnly
        onClick={() => setOpen(true)}
        size="small"
      />
      <Modal
        className={classes.modal}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        closable={false}
        width={600}
      >
        <div className={classes.inputArea}>
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
        <div className={classes.results}>
          {loading && (
            <div className={classes.emptyState}>
              <Spin />
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div className={classes.emptyState}>
              <Typography.Text type="secondary">No results found</Typography.Text>
            </div>
          )}
          {results.map((result, idx) => (
            <button
              type="button"
              key={`${result.resourceType}-${result.id}`}
              onClick={() => handleSelect(result)}
              className={`${classes.result} ${idx === selectedIndex ? classes.selected : ''}`}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <Tag
                color={RESOURCE_COLORS[result.resourceType] ?? 'default'}
                className={classes.resourceTag}
              >
                {result.resourceType}
              </Tag>
              <Typography.Text strong ellipsis className={classes.resultName}>
                {result.name || result.id}
              </Typography.Text>
              <Typography.Text type="secondary" className={classes.resultId}>
                {result.id}
              </Typography.Text>
            </button>
          ))}
        </div>
        {!loading && (
          <div className={classes.footer}>
            <span>
              <kbd>Up</kbd>
              <kbd>Down</kbd>
              Navigate
            </span>
            <span>
              <kbd>Enter</kbd>
              Open
            </span>
            <span>
              <kbd>Esc</kbd>
              Close
            </span>
          </div>
        )}
      </Modal>
    </>
  );
};
