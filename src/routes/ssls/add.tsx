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
import { showNotification } from '@/utils/notification';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { FormProvider, useForm } from 'react-hook-form';

import { postSSLReq } from '@/apis/ssls';
import { FormSubmitBtnWithCancel } from '@/components/form/Btn';
import { FormPartSSL } from '@/components/form-slice/FormPartSSL';
import {
  SSLPostSchema,
  type SSLPostType,
} from '@/components/form-slice/FormPartSSL/schema';
import { FormTOCBox } from '@/components/form-slice/FormSection';
import PageHeader from '@/components/page/PageHeader';
import { queryClient } from '@/config/global';
import { req } from '@/config/req';
import { pipeProduce } from '@/utils/producer';

const SSLAddForm = () => {
  const router = useRouter();
  const postSSL = useMutation({
    mutationFn: (d: SSLPostType) => postSSLReq(req, pipeProduce()(d)),
    async onSuccess() {
      showNotification({
        message: `Add ${'SSL'} Successfully`,
        type: 'success',
      });
      // Invalidate SSLs list query to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['ssls'] });
      await router.navigate({
        to: '/ssls',
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(SSLPostSchema),
    shouldUnregister: true,
    mode: 'all',
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((d) => postSSL.mutateAsync(d))}>
        <FormPartSSL />
        <FormSubmitBtnWithCancel>{'Add'}</FormSubmitBtnWithCancel>
      </form>
    </FormProvider>
  );
};

function RouteComponent() {
  return (
    <>
      <PageHeader title={`Add ${'SSL'}`} />
      <FormTOCBox>
        <SSLAddForm />
      </FormTOCBox>
    </>
  );
}

export const Route = createFileRoute('/ssls/add')({
  component: RouteComponent,
});
