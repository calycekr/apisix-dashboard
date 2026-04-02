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
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { Button, Skeleton, Space } from 'antd';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useBoolean } from 'react-use';

import { getRouteQueryOptions } from '@/apis/hooks';
import { putRouteReq } from '@/apis/routes';
import { FormJsonTabs } from '@/components/form/FormJsonTabs';
import { FormPartRoute } from '@/components/form-slice/FormPartRoute';
import {
  RoutePutSchema,
  type RoutePutType,
} from '@/components/form-slice/FormPartRoute/schema';
import {
  produceRoute,
  produceVarsToForm,
} from '@/components/form-slice/FormPartRoute/util';
import { produceToUpstreamForm } from '@/components/form-slice/FormPartUpstream/util';
import { FormTOCBox } from '@/components/form-slice/FormSection';
import { FormSectionGeneral } from '@/components/form-slice/FormSectionGeneral';
import { DeleteResourceBtn } from '@/components/page/DeleteResourceBtn';
import PageHeader from '@/components/page/PageHeader';
import { StatusSwitch } from '@/components/StatusTag';
import { API_ROUTES } from '@/config/constant';
import { req } from '@/config/req';
import { type APISIXType } from '@/types/schema/apisix';
import { showNotification } from '@/utils/notification';

type Props = {
  readOnly: boolean;
  setReadOnly: (v: boolean) => void;
  id: string;
};

const RouteDetailForm = (props: Props) => {
  const { readOnly, setReadOnly, id } = props;

  const routeQuery = useQuery(getRouteQueryOptions(id));
  const { data: routeData, isLoading, refetch } = routeQuery;

  const form = useForm({
    resolver: zodResolver(RoutePutSchema),
    shouldUnregister: true,
    shouldFocusError: true,
    mode: 'all',
    disabled: readOnly,
  });

  useEffect(() => {
    if (routeData?.value && !isLoading) {
      const upstreamProduced = produceToUpstreamForm(
        routeData.value.upstream || {},
        routeData.value
      );
      form.reset(produceVarsToForm(upstreamProduced) as RoutePutType);
    }
  }, [routeData, form, isLoading]);

  const putRoute = useMutation({
    mutationFn: (d: RoutePutType) =>
      putRouteReq(req, produceRoute(d) as APISIXType['Route']),
    async onSuccess() {
      showNotification({
        message: `Edit ${'Route'} Successfully`,
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
        onSubmit={(d) => putRoute.mutateAsync(d)}
        submitLabel="Save"
        disabled={readOnly}
        rawData={routeData?.value}
      >
        <FormSectionGeneral readOnly />
        <FormPartRoute />
      </FormJsonTabs>
    </FormProvider>
  );
};

type RouteDetailProps = Pick<Props, 'id'> & {
  onDeleteSuccess: () => void;
};
export const RouteDetail = (props: RouteDetailProps) => {
  const { id, onDeleteSuccess } = props;
  const [readOnly, setReadOnly] = useBoolean(true);

  return (
    <>
      <PageHeader showBackBtn
        title={`Route: ${id}`}
        tag={readOnly ? undefined : { label: 'Editing', color: 'orange' }}
        extra={
          readOnly ? (
            <Space>
              <StatusSwitch api={`${API_ROUTES}/${id}`} />
              <Link to="/routes/add" search={{ clone_from: id }}>
                <Button size="small">Clone</Button>
              </Link>
              <Button
                onClick={() => setReadOnly(false)}
                size="small"
                type="primary"
              >
                Edit
              </Button>
              <DeleteResourceBtn
                mode="detail"
                name="Route"
                target={id}
                api={`${API_ROUTES}/${id}`}
                onSuccess={onDeleteSuccess}
              />
            </Space>
          ) : undefined
        }
      />
      <FormTOCBox>
        <RouteDetailForm
          readOnly={readOnly}
          setReadOnly={setReadOnly}
          id={id}
        />
      </FormTOCBox>
    </>
  );
};

function RouteComponent() {
  const { id } = useParams({ from: '/routes/detail/$id' });
  const navigate = useNavigate();
  return (
    <RouteDetail id={id} onDeleteSuccess={() => navigate({ to: '/routes' })} />
  );
}

export const Route = createFileRoute('/routes/detail/$id')({
  component: RouteComponent,
});
