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
import { Button, message, Space, Tooltip, Typography } from 'antd';
import type React from 'react';

import IconContentCopy from '~icons/material-symbols/content-copy';

import classes from './CopyableID.module.css';

export const CopyableID = ({ id }: { id: string }) => (
  <Tooltip title={id}>
    <Typography.Text
      className={classes.id}
      copyable={{ text: id, tooltips: ['Copy ID', 'Copied'] }}
      ellipsis
    >
      {id}
    </Typography.Text>
  </Tooltip>
);

export const CopyIDButton = ({ id }: { id: string }) => {
  const handleCopy = async (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(id);
      message.success('Copied ID');
    } catch {
      message.error('Failed to copy ID');
    }
  };

  return (
    <Tooltip title="Copy ID">
      <Button
        aria-label={`Copy ID ${id}`}
        icon={<IconContentCopy />}
        onClick={handleCopy}
        size="small"
        type="text"
      />
    </Tooltip>
  );
};

export const CopyableIDLink = ({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) => (
  <Space size={2} wrap={false}>
    {children}
    <CopyIDButton id={id} />
  </Space>
);
