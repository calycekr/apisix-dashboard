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
import { Button, Modal, Space, theme, Typography } from 'antd';
import { useState } from 'react';

import { queryClient } from '@/config/global';
import { req } from '@/config/req';
import { showNotification } from '@/utils/notification';

type BulkDeleteBarProps = {
  selectedCount: number;
  resourceName: string;
  apiBase: string;
  selectedIds: string[];
  onComplete: () => void;
  onClear: () => void;
  showStatusActions?: boolean;
};

export const BulkDeleteBar = ({
  selectedCount,
  resourceName,
  apiBase,
  selectedIds,
  onComplete,
  onClear,
  showStatusActions = false,
}: BulkDeleteBarProps) => {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);

  if (selectedCount === 0) return null;

  const handleBulkDelete = () => {
    Modal.confirm({
      centered: true,
      okButtonProps: { danger: true },
      title: `Delete ${selectedCount} ${resourceName}(s)`,
      content: (
        <Typography.Text>
          Are you sure you want to delete {selectedCount} selected {resourceName}(s)?
          This action cannot be undone.
        </Typography.Text>
      ),
      okText: 'Delete All',
      cancelText: 'Cancel',
      onOk: async () => {
        setLoading(true);
        let successCount = 0;
        const errors: string[] = [];

        for (const id of selectedIds) {
          try {
            await req.delete(`${apiBase}/${id}`);
            successCount++;
          } catch (e) {
            errors.push(`${id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
          }
        }

        setLoading(false);

        if (errors.length === 0) {
          showNotification({
            message: `Successfully deleted ${successCount} ${resourceName}(s)`,
            type: 'success',
          });
        } else {
          showNotification({
            message: `Deleted ${successCount}/${selectedIds.length}. ${errors.length} failed.`,
            type: 'error',
          });
        }

        queryClient.invalidateQueries();
        onComplete();
      },
    });
  };

  const handleBulkStatus = (status: 0 | 1) => {
    const label = status === 1 ? 'Enable' : 'Disable';
    Modal.confirm({
      centered: true,
      title: `${label} ${selectedCount} ${resourceName}(s)`,
      content: (
        <Typography.Text>
          {label} {selectedCount} selected {resourceName}(s)?
        </Typography.Text>
      ),
      okText: label,
      cancelText: 'Cancel',
      onOk: async () => {
        setLoading(true);
        let successCount = 0;
        const errors: string[] = [];

        for (const id of selectedIds) {
          try {
            await req.patch(`${apiBase}/${id}`, { status });
            successCount++;
          } catch (e) {
            errors.push(`${id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
          }
        }

        setLoading(false);

        if (errors.length === 0) {
          showNotification({
            message: `${label}d ${successCount} ${resourceName}(s) successfully`,
            type: 'success',
          });
        } else {
          showNotification({
            message: `${label}d ${successCount}/${selectedIds.length}. ${errors.length} failed: ${errors.slice(0, 3).join('; ')}`,
            type: 'error',
          });
        }

        queryClient.invalidateQueries();
        onComplete();
      },
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        marginBottom: 12,
        background: token.colorPrimaryBg,
        border: `1px solid ${token.colorPrimaryBorder}`,
        borderRadius: token.borderRadius,
      }}
    >
      <Typography.Text>
        <Typography.Text strong>{selectedCount}</Typography.Text> item(s) selected
      </Typography.Text>
      <Space>
        <Button size="small" onClick={onClear}>
          Clear
        </Button>
        {showStatusActions && (
          <>
            <Button size="small" loading={loading} onClick={() => handleBulkStatus(1)}>
              Enable
            </Button>
            <Button size="small" loading={loading} onClick={() => handleBulkStatus(0)}>
              Disable
            </Button>
          </>
        )}
        <Button size="small" danger type="primary" loading={loading} onClick={handleBulkDelete}>
          Delete
        </Button>
      </Space>
    </div>
  );
};
