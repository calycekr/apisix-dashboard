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
import { Alert } from 'antd';
import { useFormContext, useWatch } from 'react-hook-form';

import { FormItemJsonInput } from '@/components/form/JsonInput';
import { FormItemNumberInput } from '@/components/form/NumberInput';
import { FormItemTextInput } from '@/components/form/TextInput';

import { FormPartBasic } from '../FormPartBasic';
import {
  FormSectionPlugins,
  FormSectionService,
  FormSectionUpstream,
} from '../FormPartRoute';
import { FormSection } from '../FormSection';
import type { StreamRoutePostType } from './schema';

const FormSectionStreamRouteBasic = () => {
  const { control } = useFormContext<StreamRoutePostType>();
  const serverAddr = useWatch({ control, name: 'server_addr' });
  const serverPort = useWatch({ control, name: 'server_port' });
  const remoteAddr = useWatch({ control, name: 'remote_addr' });
  const sni = useWatch({ control, name: 'sni' });
  const activeMatchers = [
    serverAddr && 'server address',
    serverPort && 'server port',
    remoteAddr && 'remote address',
    sni && 'SNI',
  ].filter(Boolean);

  return (
    <FormSection legend="Server" collapsible defaultOpen={true}>
      <Alert
        type={activeMatchers.length > 0 ? 'info' : 'warning'}
        showIcon
        message={
          activeMatchers.length > 0
            ? `Matching by ${activeMatchers.join(', ')}.`
            : 'No stream matching condition is set yet.'
        }
        description="Stream Routes match L4/TLS traffic before it reaches an HTTP route. Configure at least one listener or client condition, then choose a Service, Upstream ID, or inline upstream target."
        style={{ marginBottom: 12 }}
      />
      <FormItemTextInput
        control={control}
        name="server_addr"
        label="Server Address"
        description="Local address APISIX listens on for this stream route."
      />
      <FormItemNumberInput
        control={control}
        name="server_port"
        label="Server Port"
        allowDecimal={false}
        description="Local listener port. Valid range: 1-65535."
      />
      <FormItemTextInput
        control={control}
        name="remote_addr"
        label="Remote Address"
        description="Optional client IP or CIDR condition."
      />
      <FormItemTextInput
        control={control}
        name="sni"
        label="SNI"
        description="Optional TLS Server Name condition."
      />
    </FormSection>
  );
};

const FormSectionStreamRouteProtocol = () => {
  const { control } = useFormContext<StreamRoutePostType>();

  return (
    <FormSection legend="Protocol Information" collapsible defaultOpen={false}>
      <FormItemTextInput
        control={control}
        name="protocol.name"
        label="Protocol Name"
        description="Optional stream protocol extension name."
      />
      <FormItemTextInput
        control={control}
        name="protocol.superior_id"
        label="Superior ID"
        description="Optional parent protocol resource ID."
      />
      <FormItemJsonInput
        control={control}
        name="protocol.conf"
        label="Conf"
        toObject
        description="Optional protocol configuration JSON object."
      />
      <FormItemJsonInput
        control={control}
        name="protocol.logger"
        label="Logger"
        toObject
        objValue={[]}
        description="Optional logger array for protocol-specific logging."
      />
    </FormSection>
  );
};

export const FormPartStreamRoute = () => {
  return (
    <>
      <FormPartBasic showName={false} />
      <FormSectionStreamRouteBasic />
      <FormSectionService />
      <FormSectionUpstream />
      <FormSectionPlugins />
      <FormSectionStreamRouteProtocol />
    </>
  );
};
