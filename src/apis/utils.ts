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
import type { AxiosInstance } from 'axios';

import { PAGE_SIZE_MAX, PAGE_SIZE_MIN } from '@/config/constant';
import type { PageSearchType } from '@/types/schema/pageSearch';
import { stripSystemReadonlyFields } from '@/utils/apisixEditable';

type ListResponse<T> = {
  total: number;
  list: T[];
};

type CreateResourceOptions = {
  sanitize?: (data: Record<string, unknown>) => Record<string, unknown>;
};

export const createResourceReq = <TResponse>(
  req: AxiosInstance,
  apiPath: string,
  data: Record<string, unknown>,
  options: CreateResourceOptions = {}
) => {
  const id = typeof data.id === 'string' ? data.id.trim() : '';
  const sanitize = options.sanitize ?? stripSystemReadonlyFields;
  const payload = sanitize(data);

  return id
    ? req.put<unknown, TResponse>(`${apiPath}/${id}`, payload)
    : req.post<unknown, TResponse>(apiPath, payload);
};

export const deleteAllResources = async <T>(
  req: AxiosInstance,
  apiPath: string,
  listFetcher: (
    req: AxiosInstance,
    params: PageSearchType
  ) => Promise<ListResponse<T>>,
  getId: (item: T) => string
) => {
  const totalRes = await listFetcher(req, {
    page: 1,
    page_size: PAGE_SIZE_MIN,
  });
  const total = totalRes.total;
  if (total === 0) return;
  for (let times = Math.ceil(total / PAGE_SIZE_MAX); times > 0; times--) {
    const res = await listFetcher(req, {
      page: 1,
      page_size: PAGE_SIZE_MAX,
    });
    await Promise.all(
      res.list.map((d) => req.delete(`${apiPath}/${getId(d)}`))
    );
  }
};
