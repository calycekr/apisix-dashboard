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
import { QueryCache, QueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { getRequestErrorMessage } from '@/config/req';
import { showNotification } from '@/utils/notification';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Initial-load failures are owned by the route error boundary or the
      // screen's inline error state. Notify only when a refresh fails while
      // previously loaded data remains visible.
      if (query.state.data === undefined || axios.isCancel(error)) return;

      const detail = axios.isAxiosError(error)
        ? getRequestErrorMessage(error)
        : error instanceof Error
          ? error.message
          : String(error);
      showNotification({
        id: `query-refresh-error-${query.queryHash}`,
        message: `Refresh failed. Showing the last available data. ${detail}`,
        type: 'error',
      });
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (!axios.isAxiosError(error)) return failureCount < 1;
        const status = error.response?.status;
        if (status === undefined) return failureCount < 1;
        if (status === 429) return failureCount < 2;
        return false;
      },
    },
  },
});
