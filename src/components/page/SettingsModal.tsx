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
import { Alert, Button, Divider, Input, Modal, Space, Typography } from 'antd';
import axios from 'axios';
import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useState } from 'react';

import { API_HEADER_KEY, API_PREFIX } from '@/config/constant';
import { queryClient } from '@/config/global';
import { adminKeyAtom, isSettingsOpenAtom } from '@/stores/global';
import { sha } from '~build/git';

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

const AdminKey = () => {
  const [adminKey, setAdminKey] = useAtom(adminKeyAtom);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const testConnection = useCallback(async () => {
    if (!adminKey) {
      setStatus('error');
      setErrorMsg('Please enter an Admin Key first');
      return;
    }
    setStatus('testing');
    setErrorMsg('');
    try {
      // Use raw axios to bypass global interceptors — test the key directly
      await axios.get(`${API_PREFIX}/routes`, {
        params: { page: 1, page_size: 10 },
        headers: { [API_HEADER_KEY]: adminKey },
      });
      setStatus('success');
      queryClient.invalidateQueries();
      queryClient.refetchQueries();
    } catch (e) {
      setStatus('error');
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        setErrorMsg('Authentication failed — the Admin Key is incorrect');
      } else if (axios.isAxiosError(e) && !e.response) {
        setErrorMsg('Cannot reach APISIX Admin API — check that APISIX is running');
      } else {
        setErrorMsg('Connection failed — check Admin Key and APISIX status');
      }
    }
  }, [adminKey]);

  const handleKeyChange = (value: string) => {
    setAdminKey(value);
    setStatus('idle');
    setErrorMsg('');
  };

  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        Admin Key <Typography.Text type="danger">*</Typography.Text>
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
        The X-API-KEY used to authenticate with the APISIX Admin API.
        You can find this in your APISIX configuration file (config.yaml).
      </Typography.Text>
      <Space.Compact style={{ width: '100%' }}>
        <Input.Password
          value={adminKey}
          onChange={(e) => handleKeyChange(e.currentTarget.value)}
          placeholder="Enter your APISIX Admin Key"
          onPressEnter={testConnection}
          status={status === 'error' ? 'error' : undefined}
        />
        <Button
          type="primary"
          loading={status === 'testing'}
          onClick={testConnection}
        >
          Test
        </Button>
      </Space.Compact>
      {status === 'success' && (
        <Alert
          type="success"
          showIcon
          message="Connected successfully"
          style={{ marginTop: 8 }}
        />
      )}
      {status === 'error' && errorMsg && (
        <Alert
          type="error"
          showIcon
          message={errorMsg}
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
};

const UICommitSha = () => {
  return (
    <div>
      <Typography.Text style={{ display: 'block', marginBottom: 4 }}>UI Commit SHA</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 14 }}>
        {sha}
      </Typography.Text>
    </div>
  );
};

export const SettingsModal = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);
  const adminKey = useAtomValue(adminKeyAtom);
  const isFirstSetup = !adminKey;

  return (
    <Modal
      open={isSettingsOpen}
      onCancel={isFirstSetup ? undefined : () => setIsSettingsOpen(false)}
      closable={!isFirstSetup}
      maskClosable={!isFirstSetup}
      keyboard={!isFirstSetup}
      centered
      title={isFirstSetup ? 'Welcome to APISIX Dashboard' : 'Settings'}
      footer={null}
    >
      {isFirstSetup && (
        <Alert
          type="info"
          showIcon
          message="To get started, enter your APISIX Admin API key below and click Test to verify the connection."
          style={{ marginBottom: 16 }}
        />
      )}
      <AdminKey />
      <Divider style={{ marginBlock: 16 }} />
      <UICommitSha />
    </Modal>
  );
};
