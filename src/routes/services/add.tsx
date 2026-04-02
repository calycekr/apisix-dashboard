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
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { FormProvider, useForm } from 'react-hook-form';

import { postServiceReq, type ServicePostType } from '@/apis/services';
import { FormJsonTabs } from '@/components/form/FormJsonTabs';
import { FormPartService } from '@/components/form-slice/FormPartService';
import { ServicePostSchema } from '@/components/form-slice/FormPartService/schema';
import { FormTOCBox } from '@/components/form-slice/FormSection';
import PageHeader from '@/components/page/PageHeader';
import { req } from '@/config/req';
import { produceRmUpstreamWhenHas } from '@/utils/form-producer';
import { showNotification } from '@/utils/notification';
import { pipeProduce } from '@/utils/producer';

const ServiceAddForm = () => {
  const router = useRouter();

  const postService = useMutation({
    mutationFn: (d: ServicePostType) =>
      postServiceReq(
        req,
        pipeProduce(produceRmUpstreamWhenHas('upstream_id'))(d)
      ),
    async onSuccess(res) {
      showNotification({
        message: `Add ${'Service'} Successfully`,
        type: 'success',
      });
      await router.navigate({
        to: '/services/detail/$id',
        params: { id: res.data.value.id },
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(ServicePostSchema),
    shouldUnregister: true,
    shouldFocusError: true,
    mode: 'all',
  });

  return (
    <FormProvider {...form}>
      <FormJsonTabs form={form} onSubmit={(d) => postService.mutateAsync(d)} submitLabel="Add">
        <FormPartService />
      </FormJsonTabs>
    </FormProvider>
  );
};

function RouteComponent() {
  return (
    <>
      <PageHeader showBackBtn
        title={`Add ${'Service'}`}
      />
      <FormTOCBox>
        <ServiceAddForm />
      </FormTOCBox>
    </>
  );
}

export const Route = createFileRoute('/services/add')({
  component: RouteComponent,
});
