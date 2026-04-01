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
import { Divider, Input, Modal, Typography } from 'antd';
import { useAtom } from 'jotai';

import { queryClient } from '@/config/global';
import { adminKeyAtom, isSettingsOpenAtom } from '@/stores/global';
import { sha } from '~build/git';

const AdminKey = () => {
  const [adminKey, setAdminKey] = useAtom(adminKeyAtom);

  return (
    <div>
      <Typography.Text style={{ display: 'block', marginBottom: 4 }}>
        Admin Key <Typography.Text type="danger">*</Typography.Text>
      </Typography.Text>
      <Input.Password
        value={adminKey}
        onChange={(e) => {
          setAdminKey(e.currentTarget.value);
          setTimeout(() => {
            queryClient.invalidateQueries();
            queryClient.refetchQueries();
          });
        }}
      />
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

  return (
    <Modal
      open={isSettingsOpen}
      onCancel={() => setIsSettingsOpen(false)}
      centered
      title="Settings"
      footer={null}
    >
      <AdminKey />
      <Divider style={{ marginBlock: 16 }} />
      <UICommitSha />
    </Modal>
  );
};
