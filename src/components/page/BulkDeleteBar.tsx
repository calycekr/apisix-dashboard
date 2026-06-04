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
import { Button, Modal, Space, Typography } from 'antd';
import { useState } from 'react';

import { queryClient } from '@/config/global';
import { req } from '@/config/req';
import { checkDependencies } from '@/utils/checkDependencies';
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
  const [loading, setLoading] = useState(false);

  if (selectedCount === 0) return null;

  const handleBulkDelete = async () => {
    let warningContent: React.ReactNode = null;
    if (resourceName === 'Upstream' || resourceName === 'Service') {
      try {
        const allAffected: Record<string, string[]> = {};
        for (const id of selectedIds) {
          const affected = await checkDependencies(resourceName, id);
          if (affected.length > 0) {
            allAffected[id] = affected;
          }
        }
        if (Object.keys(allAffected).length > 0) {
          warningContent = (
            <div style={{ marginTop: 8, padding: 8, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
              <Typography.Text type="danger" strong style={{ display: 'block', marginBottom: 4 }}>
                ⚠️ Warning: Active references found:
              </Typography.Text>
              {Object.entries(allAffected).map(([id, list]) => (
                <div key={id} style={{ marginBottom: 6 }}>
                  <Typography.Text strong>{id}:</Typography.Text>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                    {list.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          );
        }
      } catch {
        // Ignore error
      }
    }

    Modal.confirm({
      centered: true,
      okButtonProps: { danger: true },
      title: `Delete ${selectedCount} ${resourceName}(s)`,
      content: (
        <div>
          <Typography.Text>
            Are you sure you want to delete {selectedCount} selected {resourceName}(s)?
            This action cannot be undone.
          </Typography.Text>
          {warningContent}
        </div>
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
    <div className="bulk-delete-bar-floating">
      <Typography.Text>
        Selected <Typography.Text strong style={{ color: 'var(--ant-color-primary)' }}>{selectedCount}</Typography.Text> item(s)
      </Typography.Text>
      <Space size="middle">
        <Button size="middle" disabled={loading} onClick={onClear}>
          Clear
        </Button>
        {showStatusActions && (
          <>
            <Button size="middle" loading={loading} onClick={() => handleBulkStatus(1)}>
              Enable
            </Button>
            <Button size="middle" loading={loading} onClick={() => handleBulkStatus(0)}>
              Disable
            </Button>
          </>
        )}
        <Button size="middle" danger type="primary" loading={loading} onClick={handleBulkDelete}>
          Delete
        </Button>
      </Space>
    </div>
  );
};
