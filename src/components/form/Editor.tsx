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
import { Skeleton } from 'antd';
import { Editor } from '@monaco-editor/react';
import { clsx } from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type FieldValues,
  useController,
  type UseControllerProps,
  useFormContext,
} from 'react-hook-form';
import { monaco, setupMonacoEditor } from '@/utils/monaco';
import { useThemeMode } from '@/stores/global';

import { InputWrapper } from './InputWrapper';
import { genControllerProps } from './util';

setupMonacoEditor();

const options: monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  contextmenu: false,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'none',
  lineDecorationsWidth: 0,
  acceptSuggestionOnEnter: 'on',
  // auto adjust width and height to parent
  // see: https://github.com/Microsoft/monaco-editor/issues/543#issuecomment-321767059
  automaticLayout: true,
};

type FormItemEditorWrapperProps = {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children?: React.ReactNode;
  id?: string;
};

type FormItemEditorProps<T extends FieldValues> = FormItemEditorWrapperProps &
  UseControllerProps<T> & {
    language?: string;
    isLoading?: boolean;
    customSchema?: object;
  };

export const FormItemEditor = <T extends FieldValues>(
  props: FormItemEditorProps<T>
) => {
  const { mode } = useThemeMode();
  const { controllerProps, restProps } = genControllerProps(props, '');
  const { customSchema, language, isLoading, label, description, required, id } = restProps;
  const { trigger } = useFormContext();
  const monacoErrorRef = useRef<string | null>(null);
  const isJson = !language || language === 'json';
  const enhancedControllerProps = useMemo(() => {
    return {
      ...controllerProps,
      rules: {
        ...controllerProps.rules,
        validate: (value: string) => {
          if (isJson) {
            // Check JSON syntax
            try {
              JSON.parse(value);
            } catch {
              return 'JSON format is not valid';
            }
          }
          // Check Monaco markers
          if (monacoErrorRef.current) {
            return monacoErrorRef.current;
          }
          return true;
        },
      },
    };
  }, [controllerProps, monacoErrorRef, isJson]);

  const {
    field: { value, onChange: fOnChange, ...restField },
    fieldState,
  } = useController<T>(enhancedControllerProps);

  const [internalLoading, setLoading] = useState(false);

  useEffect(() => {
    if (!isJson) return;

    setLoading(true);

    const schemas = [];
    if (customSchema) {
      schemas.push({
        uri: 'https://apisix.apache.org',
        fileMatch: ['*'],
        schema: customSchema,
      });
    }
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas,
      trailingCommas: 'error',
      enableSchemaRequest: false,
    });

    setLoading(false);
  }, [customSchema, isJson]);

  return (
    <InputWrapper
      label={label}
      description={description}
      error={fieldState.error?.message}
      required={required}
    >
      <div id={id ?? '#editor-wrapper'}>
        <input name={restField.name} type="hidden" />
        {(isLoading || internalLoading) && (
          <div
            style={{
              position: 'absolute',
              zIndex: 1,
              top: 0,
              left: 0,
              height: '100%',
              width: '100%',
            }}
            data-testid="editor-loading"
          >
            <Skeleton active />
          </div>
        )}
        <Editor
          wrapperProps={{
            className: clsx(
              'editor-wrapper',
              restField.disabled && 'editor-wrapper--disabled'
            ),
          }}
          defaultValue={controllerProps.defaultValue}
          value={value}
          onChange={fOnChange}
          onValidate={(markers) => {
            monacoErrorRef.current = markers?.[0]?.message || null;
            trigger(props.name);
          }}
          onMount={(editor) => {
            if (process.env.NODE_ENV === 'test') {
              window.__monacoEditor__ = editor;
            }
          }}
          loading={
            <div
              data-testid="editor-loading"
              style={{ height: '100%', width: '100%' }}
            >
              <Skeleton active />
            </div>
          }
          options={{ ...options, readOnly: restField.disabled }}
          theme={mode === 'dark' ? 'vs-dark' : 'vs-light'}
          defaultLanguage="json"
          {...(language && { language })}
        />
      </div>
    </InputWrapper>
  );
};
