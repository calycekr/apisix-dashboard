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

import axios, { AxiosError, type AxiosResponse, HttpStatusCode } from 'axios';
import { getDefaultStore } from 'jotai';
import { stringify } from 'qs';

import {
  API_HEADER_KEY,
  API_PREFIX,
  SKIP_INTERCEPTOR_HEADER,
} from '@/config/constant';
import { adminKeyAtom, isSettingsOpenAtom } from '@/stores/global';
import { showNotification } from '@/utils/notification';

export const req = axios.create();

req.interceptors.request.use((conf) => {
  conf.paramsSerializer = (p) => {
    if (p.filter) {
      p.filter = stringify(p.filter);
    }
    return stringify(p, {
      arrayFormat: 'repeat',
    });
  };
  conf.baseURL = API_PREFIX;
  const adminKey = getDefaultStore().get(adminKeyAtom);
  if (!adminKey) {
    getDefaultStore().set(isSettingsOpenAtom, true);
    return Promise.reject(new axios.Cancel('Admin Key not configured'));
  }
  conf.headers.set(API_HEADER_KEY, adminKey);
  return conf;
});

export type APISIXRespErr = {
  error_msg?: string;
  message?: string;
};

const matchSkipInterceptor = (err: AxiosError) => {
  const interceptors = err.config?.headers?.[SKIP_INTERCEPTOR_HEADER] || [];
  const status = err.response?.status;
  return interceptors.some((v: string) => v === String(status));
};

/** Build a human-readable error message with context */
function buildErrorMessage(err: AxiosError<APISIXRespErr>): string {
  const method = err.config?.method?.toUpperCase() ?? '';
  const path = err.config?.url ?? '';
  const status = err.response?.status;
  const apisixMsg = err.response?.data?.error_msg || err.response?.data?.message;

  // Network error (server unreachable)
  if (!err.response) {
    return `Network error: Cannot reach APISIX (${method} ${path}). Check that APISIX is running.`;
  }

  const statusLabel =
    status === 400 ? 'Bad Request' :
    status === 404 ? 'Not Found' :
    status === 409 ? 'Conflict' :
    status === 500 ? 'Server Error' :
    status === 503 ? 'Service Unavailable' :
    `Error ${status}`;

  // APISIX returned an error message
  if (apisixMsg) {
    return `${statusLabel}: ${apisixMsg} (${method} ${path})`;
  }

  return `${statusLabel} on ${method} ${path}`;
}

req.interceptors.response.use(
  (res) => {
    if (
      res.data?.list &&
      !Array.isArray(res.data.list) &&
      Object.keys(res.data.list).length === 0
    ) {
      res.data.list = [];
    }
    return res;
  },
  (err) => {
    // Don't show error for cancelled requests (e.g., Admin Key not configured)
    if (axios.isCancel(err)) {
      return Promise.reject(err);
    }

    if (err.response) {
      if (matchSkipInterceptor(err)) return Promise.reject(err);
      const res = err.response as AxiosResponse<APISIXRespErr>;

      if (res.status === HttpStatusCode.Unauthorized) {
        showNotification({
          id: 'auth-error',
          message: 'Authentication failed — check your Admin Key in Settings',
          type: 'error',
        });
        getDefaultStore().set(isSettingsOpenAtom, true);
      } else {
        const message = buildErrorMessage(err as AxiosError<APISIXRespErr>);
        showNotification({
          id: message,
          message,
          type: 'error',
        });
      }
    } else {
      // Network error — no response at all
      const message = buildErrorMessage(err as AxiosError<APISIXRespErr>);
      showNotification({
        id: 'network-error',
        message,
        type: 'error',
      });
    }

    return Promise.reject(err);
  }
);
