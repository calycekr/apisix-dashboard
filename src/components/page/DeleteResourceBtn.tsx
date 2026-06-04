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
import { Button, type ButtonProps, Modal, Typography } from 'antd';
import type { AxiosResponse } from 'axios';

import { queryClient } from '@/config/global';
import { req } from '@/config/req';
import { checkDependencies } from '@/utils/checkDependencies';
import { useCallbackRef } from '@/utils/hooks';
import { showNotification } from '@/utils/notification';

type DeleteResourceProps = {
  name: string;
  api: string;
  target?: string;
  onSuccess?:
    | ((res: AxiosResponse<unknown, unknown>) => void)
    | ((res: AxiosResponse<unknown, unknown>) => Promise<void>)
    | (() => void)
    | (() => Promise<void>);
  DeleteBtn?: typeof Button;
  mode?: 'detail' | 'list';
} & Omit<ButtonProps, 'onClick'>;
export const DeleteResourceBtn = (props: DeleteResourceProps) => {
  const {
    name,
    target,
    api,
    onSuccess,
    DeleteBtn,
    mode = 'list',
    ...btnProps
  } = props;
  const openModal = useCallbackRef(async () => {
    let warningContent: React.ReactNode = null;
    if (name === 'Upstream' || name === 'Service') {
      try {
        const id = target;
        if (id) {
          const affected = await checkDependencies(name, id);
          if (affected.length > 0) {
            warningContent = (
              <div style={{ marginTop: 8, padding: 8, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
                <Typography.Text type="danger" strong style={{ display: 'block', marginBottom: 4 }}>
                  ⚠️ Warning: This {name} is currently referenced by:
                </Typography.Text>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                  {affected.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Deleting this resource will break these dependent resources.
                </Typography.Text>
              </div>
            );
          }
        }
      } catch {
        // Ignore error
      }
    }

    Modal.confirm({
      centered: true,
      okButtonProps: { danger: true },
      title: `Delete ${name}`,
      content: (
        <div>
          <Typography.Text>
            {`Do you want to delete the ${name}`}
            {target && (
              <Typography.Text
                strong
                style={{ wordBreak: 'break-all', marginInline: '0.25em' }}
              >
                {target}
              </Typography.Text>
            )}
            ?
          </Typography.Text>
          {warningContent}
        </div>
      ),
      okText: 'Delete',
      cancelText: 'Cancel',
      onOk: () =>
        req
          .delete(api)
          .then((res) => Promise.resolve(onSuccess?.(res)))
          .then(() => {
            showNotification({
              message: `Delete ${name} Successfully`,
              type: 'success',
            });
            queryClient.invalidateQueries();
          })
          .catch(() => {
            // Error notification already shown by global interceptor with APISIX error details
          }),
    });
  });
  if (DeleteBtn) {
    return <DeleteBtn onClick={openModal} />;
  }
  return (
    <Button
      onClick={openModal}
      size="small"
      danger
      {...(mode === 'detail' && {
        type: 'primary',
      })}
      {...btnProps}
    >
      Delete
    </Button>
  );
};
