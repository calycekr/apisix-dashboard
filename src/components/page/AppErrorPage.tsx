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
import {
  type ErrorComponentProps,
  Link,
  useRouter,
} from '@tanstack/react-router';
import { Button, Card, Space, Tag, Typography } from 'antd';
import axios from 'axios';
import { useSetAtom } from 'jotai';
import { useCallback, useState } from 'react';

import type { APISIXRespErr } from '@/config/req';
import { isSettingsOpenAtom } from '@/stores/global';
import IconArrowBack from '~icons/material-symbols/arrow-back';
import IconDashboard from '~icons/material-symbols/dashboard';
import IconRefresh from '~icons/material-symbols/refresh';
import IconSettings from '~icons/material-symbols/settings';
import IconWarning from '~icons/material-symbols/warning-rounded';

import classes from './AppErrorPage.module.css';

type ErrorPresentation = {
  title: string;
  description: string;
  detail?: string;
  status?: number;
  showSettings?: boolean;
};

const getErrorPresentation = (error: unknown): ErrorPresentation => {
  if (axios.isCancel(error)) {
    return {
      title: 'Admin Key required',
      description: 'Configure an APISIX Admin Key before loading this resource.',
      showSettings: true,
    };
  }

  if (axios.isAxiosError<APISIXRespErr>(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.error_msg || error.response?.data?.message;

    if (!error.response) {
      return {
        title: 'Cannot reach APISIX',
        description:
          'The dashboard could not connect to the APISIX Admin API. Check that APISIX is running and reachable.',
        detail: error.config?.url,
      };
    }

    if (status === 401 || status === 403) {
      return {
        title: 'Authentication failed',
        description: 'APISIX rejected the configured Admin Key.',
        detail,
        status,
        showSettings: true,
      };
    }

    if (status === 404) {
      return {
        title: 'Resource not found',
        description: 'This resource may have been deleted or its identifier may have changed.',
        detail,
        status,
      };
    }

    if (status === 503) {
      return {
        title: 'Configuration store unavailable',
        description:
          'The Admin API is reachable, but APISIX cannot access its configuration store. Check APISIX-to-etcd connectivity.',
        detail,
        status,
      };
    }

    if (status === 400 || status === 409 || status === 422) {
      return {
        title: status === 409 ? 'Configuration conflict' : 'APISIX rejected the request',
        description: 'Review the resource configuration and try again.',
        detail,
        status,
      };
    }

    return {
      title: 'Admin API request failed',
      description: 'APISIX could not complete the requested operation.',
      detail,
      status,
    };
  }

  return {
    title: 'Something went wrong',
    description: 'The dashboard could not finish loading this screen.',
    detail: error instanceof Error ? error.message : undefined,
  };
};

export const AppErrorPage = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter();
  const setSettingsOpen = useSetAtom(isSettingsOpenAtom);
  const [retrying, setRetrying] = useState(false);
  const presentation = getErrorPresentation(error);

  const retry = useCallback(async () => {
    setRetrying(true);
    reset();
    try {
      await router.invalidate();
    } finally {
      setRetrying(false);
    }
  }, [reset, router]);

  return (
    <div className={classes.viewport}>
      <Card className={classes.card}>
        <div className={classes.icon} aria-hidden="true">
          <IconWarning />
        </div>
        <div className={classes.copy}>
          <div className={classes.heading}>
            <Typography.Title level={3} className={classes.title}>
              {presentation.title}
            </Typography.Title>
            {presentation.status && <Tag>HTTP {presentation.status}</Tag>}
          </div>
          <Typography.Paragraph type="secondary" className={classes.description}>
            {presentation.description}
          </Typography.Paragraph>
          {presentation.detail && (
            <div className={classes.detail}>
              <Typography.Text type="secondary">APISIX response</Typography.Text>
              <Typography.Text code>{presentation.detail}</Typography.Text>
            </div>
          )}
          <Space wrap className={classes.actions}>
            <Button type="primary" icon={<IconRefresh />} loading={retrying} onClick={retry}>
              Retry
            </Button>
            {presentation.showSettings && (
              <Button icon={<IconSettings />} onClick={() => setSettingsOpen(true)}>
                Open Settings
              </Button>
            )}
            <Button icon={<IconArrowBack />} onClick={() => router.history.back()}>
              Back
            </Button>
            <Link to="/dashboard">
              <Button type="text" icon={<IconDashboard />}>Dashboard</Button>
            </Link>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export const AppNotFoundPage = () => (
  <div className={classes.viewport}>
    <Card className={classes.card}>
      <div className={classes.code}>404</div>
      <div className={classes.copy}>
        <Typography.Title level={3} className={classes.title}>Page not found</Typography.Title>
        <Typography.Paragraph type="secondary" className={classes.description}>
          The requested dashboard page does not exist or has moved.
        </Typography.Paragraph>
        <Space wrap className={classes.actions}>
          <Link to="/dashboard">
            <Button type="primary" icon={<IconDashboard />}>Go to Dashboard</Button>
          </Link>
        </Space>
      </div>
    </Card>
  </div>
);
