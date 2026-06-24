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
import { Button, Divider } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { FormItemNumberInput } from '@/components/form/NumberInput';
import { FormItemSelect } from '@/components/form/Select';
import { FormItemSwitch } from '@/components/form/Switch';
import { FormItemTextareaWithUpload } from '@/components/form/TextareaWithUpload';
import { FormItemTextInput } from '@/components/form/TextInput';
import { APISIX } from '@/types/schema/apisix';
import { useNamePrefix } from '@/utils/useNamePrefix';

import { FormPartBasic } from '../FormPartBasic';
import { FormSection } from '../FormSection';
import { ResourceHierarchy } from '../ResourceHierarchy';
import { FormItemNodes } from './FormItemNodes';
import { FormSectionChecks } from './FormSectionChecks';
import { FormSectionDiscovery } from './FormSectionDiscovery';
import type { FormPartUpstreamType } from './schema';

const hasFieldValue = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.values(value).some(hasFieldValue);
  }
  return true;
};

const OptionalNestedSection = ({
  name,
  legend,
  children,
}: {
  name: 'timeout' | 'keepalive_pool' | 'tls';
  legend: string;
  children: ReactNode;
}) => {
  const { control, setValue, unregister } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  const fieldName = np(name);
  const fieldValue = useWatch({ control, name: fieldName });
  const [enabled, setEnabled] = useState(() => hasFieldValue(fieldValue));

  useEffect(() => {
    if (hasFieldValue(fieldValue)) {
      setEnabled(true);
    }
  }, [fieldValue]);

  const enableSection = () => {
    setEnabled(true);
  };

  const removeSection = () => {
    unregister(fieldName);
    setValue(fieldName, undefined, { shouldDirty: true });
    setEnabled(false);
  };

  if (!enabled) {
    return (
      <FormSection legend={legend} collapsible>
        <Button onClick={enableSection}>Configure {legend}</Button>
      </FormSection>
    );
  }

  return (
    <>
      {children}
      <Button danger onClick={removeSection}>
        Remove {legend}
      </Button>
    </>
  );
};

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
        data={APISIX.UpstreamBalancer.options.map((v) => v.value)}
        description="roundrobin: weighted round-robin. chash: consistent hashing. least_conn: least connections. ewma: exponentially weighted moving average latency."
      />
      <FormItemSelect
        control={control}
        name={np('hash_on')}
        label="Hash On"
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
  const passHost = useWatch({ control, name: np('pass_host') });
  return (
    <FormSection legend="Pass Host">
      <FormItemSelect
        control={control}
        name={np('pass_host')}
        label="Pass Host"
        data={APISIX.UpstreamPassHost.options.map((v) => v.value)}
        description="pass: forward the client Host header. node: use the host from the upstream node. rewrite: use the custom Upstream Host value below."
      />
      <FormItemTextInput
        control={control}
        name={np('upstream_host')}
        label="Upstream Host"
        required={passHost === 'rewrite'}
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
    <FormSection legend="Timeout" collapsible defaultOpen>
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

export const FormPartUpstream = ({
  showHierarchy = true,
  showID = true,
}: {
  showHierarchy?: boolean;
  showID?: boolean;
}) => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  const serviceName = useWatch({ control, name: np('service_name') });
  const discoveryType = useWatch({ control, name: np('discovery_type') });
  const hasCompleteDiscovery = !!serviceName?.trim() && !!discoveryType?.trim();
  return (
    <>
      {showHierarchy && (
        <ResourceHierarchy
          current="upstream"
          resolvedThrough="inline-upstream"
        />
      )}
      <FormPartBasic showID={showID} />
      <FormSection legend="Backend Source" collapsible defaultOpen={true}>
        <FormSection legend="Nodes">
          <FormItemNodes
            name={np('nodes')}
            label="Backend Nodes"
            required={!hasCompleteDiscovery}
          />
        </FormSection>
        <Divider style={{ margin: '8px 0' }}>OR</Divider>
        <FormSectionDiscovery />
      </FormSection>
      <FormSection legend="Connection Configuration" collapsible defaultOpen>
        <FormItemScheme />
        <FormSectionLoadbalancing />
        <FormSectionPassHost />
        <FormSectionRetry />
        <OptionalNestedSection name="timeout" legend="Timeout">
          <FormSectionTimeout />
        </OptionalNestedSection>
        <OptionalNestedSection name="keepalive_pool" legend="Keepalive Pool">
          <FormSectionKeepAlive />
        </OptionalNestedSection>
        <OptionalNestedSection name="tls" legend="TLS">
          <FormSectionTLS />
        </OptionalNestedSection>
      </FormSection>

      <FormSectionChecks />
    </>
  );
};
