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
import { useQuery } from '@tanstack/react-query';
import { Switch, Tag } from 'antd';
import { useState } from 'react';

import { queryClient } from '@/config/global';
import { req } from '@/config/req';
import { showNotification } from '@/utils/notification';

export const StatusTag = ({ status }: { status?: 0 | 1 }) => {
  if (status === 1) return <Tag color="success">Enabled</Tag>;
  if (status === 0) return <Tag color="default">Disabled</Tag>;
  return <Tag>Unknown</Tag>;
};

type StatusSwitchProps = {
  /** Current status — if omitted, auto-fetches from API */
  status?: 0 | 1;
  api: string;
};

export const StatusSwitch = ({ status: statusProp, api }: StatusSwitchProps) => {
  const [loading, setLoading] = useState(false);

  // Auto-fetch status when not provided (e.g., detail page header)
  const { data: fetchedStatus } = useQuery({
    queryKey: ['status', api],
    queryFn: () => req.get(api).then((r) => (r.data?.value?.status as 0 | 1 | undefined) ?? undefined),
    enabled: statusProp === undefined,
    staleTime: 10_000,
  });

  const status = statusProp ?? fetchedStatus;

  if (status === undefined) return <Tag>—</Tag>;

  const handleToggle = async (checked: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      await req.patch(api, { status: checked ? 1 : 0 });
      queryClient.invalidateQueries();
      showNotification({
        message: `Status changed to ${checked ? 'Enabled' : 'Disabled'}`,
        type: 'success',
      });
    } catch {
      // Error notification already shown by global interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Switch
      checked={status === 1}
      onChange={handleToggle}
      loading={loading}
      checkedChildren="On"
      unCheckedChildren="Off"
      size="small"
    />
  );
};
