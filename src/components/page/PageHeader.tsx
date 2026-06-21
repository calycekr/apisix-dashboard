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
import { useRouter } from '@tanstack/react-router';
import { Button, Tag, Typography } from 'antd';
import { clsx } from 'clsx';
import { type FC } from 'react';

import IconArrowBack from '~icons/material-symbols/arrow-back';

import classes from './PageHeader.module.css';

type PageHeaderProps = {
  title: string;
  desc?: string;
  extra?: React.ReactNode;
  showBackBtn?: boolean;
  tag?: { label: string; color: string };
};

const PageHeader: FC<PageHeaderProps> = (props) => {
  const { title, desc, extra, showBackBtn = false, tag } = props;
  const router = useRouter();
  return (
    <div className={clsx(classes.root, showBackBtn && classes.constrained)}>
      <div className={classes.row}>
        <div className={classes.titleGroup}>
          {showBackBtn && (
            <Button
              type="text"
              size="small"
              icon={<IconArrowBack />}
              onClick={() => router.history.back()}
              aria-label="Go back"
              title="Go back"
            />
          )}
          <div className={classes.copy}>
            <div className={classes.titleRow}>
              <Typography.Title level={2} className={classes.title}>{title}</Typography.Title>
              {tag && <Tag color={tag.color}>{tag.label}</Tag>}
            </div>
            {desc && (
              <Typography.Text type="secondary" className={classes.description}>
                {desc}
              </Typography.Text>
            )}
          </div>
        </div>
        {extra && <div className={classes.extra}>{extra}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
