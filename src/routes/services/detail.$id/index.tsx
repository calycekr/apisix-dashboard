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
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { Button, Skeleton, Space } from 'antd';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useBoolean } from 'react-use';

import { getServiceQueryOptions } from '@/apis/hooks';
import { putServiceReq } from '@/apis/services';
import { FormJsonTabs } from '@/components/form/FormJsonTabs';
import { FormPartService } from '@/components/form-slice/FormPartService';
import { FormTOCBox } from '@/components/form-slice/FormSection';
import { FormSectionGeneral } from '@/components/form-slice/FormSectionGeneral';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { API_SERVICES } from '@/config/constant';
import { req } from '@/config/req';
import { APISIX, type APISIXType } from '@/types/schema/apisix';
import { produceRmUpstreamWhenHas } from '@/utils/form-producer';
import { showNotification } from '@/utils/notification';
import { pipeProduce } from '@/utils/producer';

type Props = {
  readOnly: boolean;
  setReadOnly: (v: boolean) => void;
};

const ServiceDetailForm = (props: Props) => {
  const { readOnly, setReadOnly } = props;
  const { id } = useParams({ from: '/services/detail/$id' });

  const serviceQuery = useSuspenseQuery(getServiceQueryOptions(id));
  const { data: serviceData, isLoading, refetch } = serviceQuery;

  const form = useForm({
    resolver: zodResolver(APISIX.Service),
    shouldUnregister: true,
    shouldFocusError: true,
    mode: 'all',
    disabled: readOnly,
  });

  useEffect(() => {
    if (serviceData?.value && !isLoading) {
      form.reset(serviceData.value);
    }
  }, [serviceData, form, isLoading]);

  const putService = useMutation({
    mutationFn: (d: APISIXType['Service']) =>
      putServiceReq(
        req,
        pipeProduce(produceRmUpstreamWhenHas('upstream_id'))(d)
      ),
    async onSuccess() {
      showNotification({
        message: `Edit ${'Service'} Successfully`,
        type: 'success',
      });
      await refetch();
      setReadOnly(true);
    },
  });

  if (isLoading) {
    return <Skeleton active />;
  }

  return (
    <FormProvider {...form}>
      <FormJsonTabs
        form={form}
        onSubmit={(d) => putService.mutateAsync(d)}
        submitLabel="Save"
        disabled={readOnly}
      >
        <FormSectionGeneral />
        <FormPartService />
      </FormJsonTabs>
    </FormProvider>
  );
};

function RouteComponent() {
  const [readOnly, setReadOnly] = useBoolean(true);
  const { id } = useParams({ from: '/services/detail/$id' });
  const navigate = useNavigate();

  return (
    <>
      <PageHeader showBackBtn
        title={`Edit ${'Service'}`}
        {...(readOnly && {
          title: `${'Service'} Detail`,
          extra: (
            <Space>
              <Button
                onClick={() => setReadOnly(false)}
                size="small"
                type="primary"
              >
                Edit
              </Button>
              <DeleteResourceBtn
                mode="detail"
                name="Service"
                target={id}
                api={`${API_SERVICES}/${id}`}
                onSuccess={() => navigate({ to: '/services' })}
              />
            </Space>
          ),
        })}
      />
      <FormTOCBox>
        <ServiceDetailForm readOnly={readOnly} setReadOnly={setReadOnly} />
      </FormTOCBox>
    </>
  );
}

export const Route = createFileRoute('/services/detail/$id/')({
  component: RouteComponent,
});
