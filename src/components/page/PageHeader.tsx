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
import { Typography } from 'antd';
import { type FC } from 'react';

type PageHeaderProps = {
  title: string;
  desc?: string;
  extra?: React.ReactNode;
};

const PageHeader: FC<PageHeaderProps> = (props) => {
  const { title, desc, extra } = props;
  return (
    <div style={{ paddingBlock: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Typography.Title level={2} style={{ margin: 0 }}>{title}</Typography.Title>
          {desc && (
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {desc}
            </Typography.Text>
          )}
        </div>
        {extra}
      </div>
    </div>
  );
};

export default PageHeader;
