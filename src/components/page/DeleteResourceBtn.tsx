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
  const openModal = useCallbackRef(() => {
    Modal.confirm({
      centered: true,
      okButtonProps: { danger: true },
      title: `Delete ${name}`,
      content: (
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
