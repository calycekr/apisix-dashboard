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
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router';
import { Skeleton } from 'antd';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

import { getServiceQueryOptions } from '@/apis/hooks';
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

const ServiceAddForm = ({ defaultValues }: { defaultValues?: ServicePostType }) => {
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
    defaultValues,
  });

  return (
    <FormProvider {...form}>
      <FormJsonTabs form={form} onSubmit={(d) => postService.mutateAsync(d)} submitLabel="Add">
        <FormPartService />
      </FormJsonTabs>
    </FormProvider>
  );
};

const addSearchSchema = z.object({
  clone_from: z.string().optional(),
  upstream_id: z.string().optional(),
});

function RouteComponent() {
  const { clone_from, upstream_id } = useSearch({ from: '/services/add' });

  const { data: sourceData, isLoading } = useQuery({
    ...getServiceQueryOptions(clone_from ?? ''),
    enabled: !!clone_from,
  });

  const cloneValues = sourceData?.value
    ? (() => {
        const copy = { ...sourceData.value } as Record<string, unknown>;
        delete copy.id;
        delete copy.create_time;
        delete copy.update_time;
        if (copy.name) copy.name = `${copy.name} (copy)`;
        return copy as ServicePostType;
      })()
    : undefined;

  if (clone_from && isLoading) {
    return (
      <>
        <PageHeader showBackBtn title="Clone Service" />
        <Skeleton active />
      </>
    );
  }

  return (
    <>
      <PageHeader
        showBackBtn
        title={clone_from ? 'Clone Service' : 'Add Service'}
        desc={clone_from ? `Cloning from ${clone_from}` : undefined}
      />
      <FormTOCBox>
        <ServiceAddForm defaultValues={cloneValues ?? (upstream_id ? { upstream_id } as ServicePostType : undefined)} />
      </FormTOCBox>
    </>
  );
}

export const Route = createFileRoute('/services/add')({
  component: RouteComponent,
  validateSearch: addSearchSchema,
});
