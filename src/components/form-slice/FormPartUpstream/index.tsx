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
import { Divider } from 'antd';
import { useFormContext } from 'react-hook-form';

import { FormItemNumberInput } from '@/components/form/NumberInput';
import { FormItemSelect } from '@/components/form/Select';
import { FormItemSwitch } from '@/components/form/Switch';
import { FormItemTextareaWithUpload } from '@/components/form/TextareaWithUpload';
import { FormItemTextInput } from '@/components/form/TextInput';
import { APISIX } from '@/types/schema/apisix';
import { useNamePrefix } from '@/utils/useNamePrefix';

import { FormPartBasic } from '../FormPartBasic';
import { FormSection } from '../FormSection';
import { FormItemNodes } from './FormItemNodes';
import { FormSectionChecks } from './FormSectionChecks';
import { FormSectionDiscovery } from './FormSectionDiscovery';
import type { FormPartUpstreamType } from './schema';

export const FormSectionTLS = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();

  return (
    <FormSection legend="TLS">
      <FormItemSwitch
        control={control}
        name={np('tls.verify')}
        label="Verify"
      />
      <FormSection legend="Client Cert Key Pair">
        <FormItemTextareaWithUpload
          control={control}
          name={np('tls.client_cert')}
          label="Client Cert"
          description="Supports $secret:// references (e.g. $secret://vault/my-cert)"
        />
        <FormItemTextareaWithUpload
          control={control}
          name={np('tls.client_key')}
          label="Client Key"
          description="Supports $secret:// references (e.g. $secret://vault/my-key)"
        />
        <Divider style={{ margin: '8px 0' }}>OR</Divider>
        <FormItemTextInput
          control={control}
          name={np('tls.client_cert_id')}
          label="Client Cert ID"
        />
      </FormSection>
    </FormSection>
  );
};

export const FormItemScheme = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormItemSelect
      control={control}
      name={np('scheme')}
      label="Scheme"
      defaultValue={APISIX.UpstreamSchemeL7.options[0].value}
      data={[
        {
          group: 'L7',
          items: APISIX.UpstreamSchemeL7.options.map((v) => v.value),
        },
        {
          group: 'L4',
          items: APISIX.UpstreamSchemeL4.options.map((v) => v.value),
        },
      ]}
    />
  );
};

export const FormSectionLoadbalancing = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Load Balancing">
      <FormItemSelect
        control={control}
        name={np('type')}
        label="Type"
        defaultValue={APISIX.UpstreamBalancer.options[0].value}
        data={APISIX.UpstreamBalancer.options.map((v) => v.value)}
        description="roundrobin: weighted round-robin. chash: consistent hashing. least_conn: least connections. ewma: exponentially weighted moving average latency."
      />
      <FormItemSelect
        control={control}
        name={np('hash_on')}
        label="Hash On"
        defaultValue={APISIX.UpstreamHashOn.options[0].value}
        data={APISIX.UpstreamHashOn.options.map((v) => v.value)}
        description="Only used when type is chash. Determines what to hash on: vars (Nginx variables), header, cookie, or consumer."
      />
      <FormItemTextInput
        control={control}
        name={np('key')}
        label="Key"
        description="Only used when type is chash. The specific variable/header/cookie name to hash on (e.g., remote_addr, X-Forwarded-For)."
      />
    </FormSection>
  );
};

export const FormSectionPassHost = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Pass Host">
      <FormItemSelect
        control={control}
        name={np('pass_host')}
        label="Pass Host"
        defaultValue={APISIX.UpstreamPassHost.options[0].value}
        data={APISIX.UpstreamPassHost.options.map((v) => v.value)}
        description="pass: forward the client Host header. node: use the host from the upstream node. rewrite: use the custom Upstream Host value below."
      />
      <FormItemTextInput
        control={control}
        name={np('upstream_host')}
        label="Upstream Host"
        description="Required when Pass Host is 'rewrite'. The Host header sent to the upstream."
      />
    </FormSection>
  );
};

export const FormSectionRetry = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Retry">
      <FormItemNumberInput
        control={control}
        name={np('retries')}
        label="Retries"
        allowDecimal={false}
        description="Number of retries on failure. Default uses the number of backend nodes."
      />
      <FormItemNumberInput
        control={control}
        name={np('retry_timeout')}
        label="Retry timeout"
        suffix="s"
        allowDecimal={false}
        description="Max time in seconds to spend retrying. 0 means no limit."
      />
    </FormSection>
  );
};

export const FormSectionTimeout = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Timeout" collapsible defaultOpen={false}>
      <FormItemNumberInput
        control={control}
        name={np('timeout.connect')}
        label="Connect"
        suffix="s"
      />
      <FormItemNumberInput
        control={control}
        name={np('timeout.send')}
        label="Send"
        suffix="s"
      />
      <FormItemNumberInput
        control={control}
        name={np('timeout.read')}
        label="Read"
        suffix="s"
      />
    </FormSection>
  );
};

export const FormSectionKeepAlive = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Keepalive Pool">
      <FormItemNumberInput
        control={control}
        name={np('keepalive_pool.size')}
        label="Size"
      />
      <FormItemNumberInput
        control={control}
        name={np('keepalive_pool.idle_timeout')}
        label="IDLE Timeout"
        suffix="s"
      />
      <FormItemNumberInput
        control={control}
        name={np('keepalive_pool.requests')}
        label="Requests"
        allowDecimal={false}
      />
    </FormSection>
  );
};

export const FormPartUpstream = () => {
  const np = useNamePrefix();
  return (
    <>
      <FormPartBasic />
      <FormSection legend="Find Upstream From" collapsible defaultOpen={true}>
        <FormSection legend="Nodes">
          <FormItemNodes name={np('nodes')} required />
        </FormSection>
        <Divider style={{ margin: '8px 0' }}>OR</Divider>
        <FormSectionDiscovery />
      </FormSection>
      <FormSection legend="Connection Configuration" collapsible defaultOpen={false}>
        <FormItemScheme />
        <FormSectionLoadbalancing />
        <FormSectionPassHost />
        <FormSectionRetry />
        <FormSectionTimeout />
        <FormSectionKeepAlive />
        <FormSectionTLS />
      </FormSection>

      <FormSectionChecks />
    </>
  );
};
