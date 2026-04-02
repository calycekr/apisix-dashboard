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
import { produce } from 'immer';
import { isNotEmpty } from 'rambdax';
import { z } from 'zod';

import { APISIX, type APISIXType } from '@/types/schema/apisix';

const SSLForm = z.object({
  __clientEnabled: z.boolean().optional(),
});

export const SSLPostSchema = APISIX.SSL.omit({
  create_time: true,
  update_time: true,
})
  .merge(SSLForm)
  .refine((data) => data.cert || (data.certs && data.certs.length > 0), {
    message: 'At least one certificate is required (cert or certs)',
    path: ['cert'],
  })
  .refine((data) => data.key || (data.keys && data.keys.length > 0), {
    message: 'At least one key is required (key or keys)',
    path: ['key'],
  });

export type SSLPostType = z.input<typeof SSLPostSchema>;

export const SSLPutSchema = APISIX.SSL.merge(SSLForm);

export type SSLPutType = z.infer<typeof SSLPutSchema>;

export const produceToSSLForm = (data: APISIXType['SSL']) =>
  produce(data as SSLPutType, (draft) => {
    draft.__clientEnabled = isNotEmpty(draft.client);
  });
