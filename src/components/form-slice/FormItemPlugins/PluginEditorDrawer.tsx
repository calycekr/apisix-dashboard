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
import { Drawer, Typography } from 'antd';
import { isEmpty, isNil } from 'rambdax';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormSubmitBtn } from '@/components/form/Btn';
import { FormItemEditor } from '@/components/form/Editor';

import type { PluginCardListProps } from './PluginCardList';

export type PluginConfig = { name: string; config: object };
export type PluginEditorDrawerProps = Pick<PluginCardListProps, 'mode'> & {
  opened: boolean;
  onClose: () => void;
  onSave: (props: PluginConfig) => void;
  plugin: PluginConfig;
  schema?: object;
};

const toConfigStr = (p: object): string => {
  return !isEmpty(p) && !isNil(p) ? JSON.stringify(p, null, 2) : '{}';
};
export const PluginEditorDrawer = (props: PluginEditorDrawerProps) => {
  const { opened, onSave, onClose, plugin, mode, schema } = props;
  const { name, config } = plugin;
  const { t } = useTranslation();
  const methods = useForm<{ config: string }>({
    criteriaMode: 'all',
    disabled: mode === 'view',
    defaultValues: { config: toConfigStr(config) },
  });
  const handleClose = () => {
    onClose();
    methods.reset();
  };

  useEffect(() => {
    methods.setValue('config', toConfigStr(config));
  }, [config, methods]);

  const title = mode === 'add'
    ? t('form.plugins.addPlugin')
    : mode === 'edit'
      ? t('form.plugins.editPlugin')
      : t('form.plugins.viewPlugin');

  return (
    <Drawer
      placement="right"
      width="md"
      keyboard={false}
      open={opened}
      onClose={handleClose}
      title={title}
      styles={{ body: { paddingTop: '18px' } }}
    >
      <Typography.Title level={3} style={{ marginBottom: 10 }}>
        {name}
      </Typography.Title>
      <FormProvider {...methods}>
        <form>
          <FormItemEditor
            name="config"
            customSchema={schema}
            isLoading={!schema}
            required
          />
        </form>

        {mode !== 'view' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <FormSubmitBtn
              size="small"
              type="text"
              onClick={methods.handleSubmit(({ config }) => {
                onSave({ name, config: JSON.parse(config) });
                handleClose();
              })}
            >
              {mode === 'add' && t('form.btn.add')}
              {mode === 'edit' && t('form.btn.save')}
            </FormSubmitBtn>
          </div>
        )}
      </FormProvider>
    </Drawer>
  );
};
