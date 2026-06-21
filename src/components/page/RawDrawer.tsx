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
import { Drawer, message, Modal, Typography } from 'antd';
import { useCallback, useState } from 'react';

import { AdminApiJsonEditor } from '@/components/page/AdminApiJsonEditor';

type RawDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  /** Full API path, e.g. '/routes/123' */
  api: string;
  title: string;
  /** Pre-loaded data from list cache — avoids re-fetching */
  initialData?: Record<string, unknown>;
};

export const RawDrawer = ({ open, onClose, onSaved, api, title, initialData }: RawDrawerProps) => {
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const closeDrawer = useCallback(() => {
    if (saving) {
      message.info('Save is still in progress');
      return;
    }

    if (!isDirty) {
      onClose();
      return;
    }

    Modal.confirm({
      title: 'Discard unsaved changes?',
      content: 'Your RAW edits have not been saved.',
      okText: 'Discard',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: onClose,
    });
  }, [isDirty, onClose, saving]);

  return (
    <Drawer
      open={open}
      onClose={closeDrawer}
      title={
        <div>
          <div>{title}</div>
          <Typography.Text type="secondary" copyable style={{ fontSize: 'var(--app-font-size-sm)', fontFamily: 'var(--app-font-monospace)' }}>
            {api}
          </Typography.Text>
        </div>
      }
      styles={{
        wrapper: { width: 700, maxWidth: '100vw' },
        body: {
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        },
      }}
      placement="right"
      destroyOnHidden
    >
      <AdminApiJsonEditor
        active={open}
        api={api}
        autoFetch
        fillAvailable
        initialData={initialData}
        onDirtyChange={setIsDirty}
        onSaved={onSaved}
        onSavingChange={setSaving}
      />
    </Drawer>
  );
};
