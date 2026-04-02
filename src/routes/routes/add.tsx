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
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormProvider, useForm } from 'react-hook-form';

import { postRouteReq } from '@/apis/routes';
import { FormJsonTabs } from '@/components/form/FormJsonTabs';
import { FormPartRoute } from '@/components/form-slice/FormPartRoute';
import {
  RoutePostSchema,
  type RoutePostType,
} from '@/components/form-slice/FormPartRoute/schema';
import { produceRoute } from '@/components/form-slice/FormPartRoute/util';
import { FormTOCBox } from '@/components/form-slice/FormSection';
import PageHeader from '@/components/page/PageHeader';
import { req } from '@/config/req';
import type { APISIXType } from '@/types/schema/apisix';
import { showNotification } from '@/utils/notification';

type Props = {
  navigate: (res: APISIXType['RespRouteDetail']) => Promise<void>;
  defaultValues?: Partial<RoutePostType>;
};

export const RouteAddForm = (props: Props) => {
  const { navigate, defaultValues } = props;

  const postRoute = useMutation({
    mutationFn: (d: RoutePostType) => postRouteReq(req, produceRoute(d)),
    async onSuccess(res) {
      showNotification({
        message: `Add ${'Route'} Successfully`,
        type: 'success',
      });
      await navigate(res);
    },
  });

  const form = useForm({
    resolver: zodResolver(RoutePostSchema),
    shouldUnregister: true,
    shouldFocusError: true,
    mode: 'all',
    defaultValues,
  });

  return (
    <FormProvider {...form}>
      <FormJsonTabs form={form} onSubmit={(d) => postRoute.mutateAsync(d)} submitLabel="Add">
        <FormPartRoute />
      </FormJsonTabs>
    </FormProvider>
  );
};

function RouteComponent() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader showBackBtn title={`Add ${'Route'}`} />
      <FormTOCBox>
        <RouteAddForm
          navigate={(res) =>
            navigate({
              to: '/routes/detail/$id',
              params: { id: res.data.value.id },
            })
          }
        />
      </FormTOCBox>
    </>
  );
}

export const Route = createFileRoute('/routes/add')({
  component: RouteComponent,
});
