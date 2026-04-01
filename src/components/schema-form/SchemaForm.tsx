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
import {
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback } from 'react';
import IconAdd from '~icons/material-symbols/add';
import IconDelete from '~icons/material-symbols/delete-forever-outline';
import IconInfo from '~icons/material-symbols/info-outline';

export type SchemaFormProps = {
  schema: Record<string, unknown>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  prefix?: string;
  requiredFields?: string[];
};

type JSONSchemaProperty = {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
  required?: string[];
  oneOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
};

type FieldRendererProps = {
  fieldKey: string;
  schema: JSONSchemaProperty;
  value: unknown;
  onChange: (val: unknown) => void;
  disabled?: boolean;
  required?: boolean;
};

const FieldLabel = ({
  label,
  description,
  required,
}: {
  label: string;
  description?: string;
  required?: boolean;
}) => (
  <div style={{ marginBottom: 4 }}>
    <Typography.Text>
      {required && (
        <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>
      )}
      {label}
      {description && (
        <Tooltip title={description}>
          <IconInfo style={{ marginLeft: 6, color: '#8c8c8c', cursor: 'help', fontSize: 14 }} />
        </Tooltip>
      )}
    </Typography.Text>
  </div>
);

const FieldWrapper = ({
  fieldKey,
  schema,
  required,
  children,
}: {
  fieldKey: string;
  schema: JSONSchemaProperty;
  required?: boolean;
  children: React.ReactNode;
}) => {
  const label = schema.title || fieldKey;
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel label={label} description={schema.description} required={required} />
      {children}
    </div>
  );
};

const ArrayOfObjectsField = ({
  fieldKey,
  schema,
  value,
  onChange,
  disabled,
  required,
}: FieldRendererProps) => {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  const handleAdd = useCallback(() => {
    onChange([...items, {}]);
  }, [items, onChange]);

  const handleRemove = useCallback((index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  }, [items, onChange]);

  const handleItemChange = useCallback((index: number, itemVal: Record<string, unknown>) => {
    const next = items.map((item, i) => (i === index ? itemVal : item));
    onChange(next);
  }, [items, onChange]);

  const itemSchema = schema.items as JSONSchemaProperty | undefined;

  return (
    <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {items.map((item, index) => (
          <Card
            key={index}
            size="small"
            style={{ background: '#fafafa' }}
            extra={
              !disabled && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<IconDelete />}
                  onClick={() => handleRemove(index)}
                />
              )
            }
          >
            {itemSchema?.properties ? (
              <SchemaForm
                schema={itemSchema as Record<string, unknown>}
                value={item}
                onChange={(val) => handleItemChange(index, val)}
                disabled={disabled}
                requiredFields={itemSchema.required}
              />
            ) : (
              <Input
                value={String(item ?? '')}
                disabled={disabled}
                onChange={(e) => {
                  const next = items.map((v, i) => (i === index ? e.target.value : v));
                  onChange(next);
                }}
              />
            )}
          </Card>
        ))}
        {!disabled && (
          <Button
            type="dashed"
            onClick={handleAdd}
            icon={<IconAdd />}
            size="small"
          >
            Add item
          </Button>
        )}
      </Space>
    </FieldWrapper>
  );
};

const OneOfField = ({
  fieldKey,
  schema,
  value,
  onChange,
  disabled,
  required,
}: FieldRendererProps) => {
  const variants = (schema.oneOf || schema.anyOf) as JSONSchemaProperty[];
  const currentVal = value as Record<string, unknown> | undefined;

  // Identify which variant is selected by matching known keys
  const selectedIndex = (() => {
    if (!currentVal || Object.keys(currentVal).length === 0) return 0;
    let best = 0;
    let bestScore = -1;
    variants.forEach((v, i) => {
      const props = v.properties ? Object.keys(v.properties) : [];
      const score = props.filter((k) => k in (currentVal as object)).length;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best;
  })();

  const selectedVariant = variants[selectedIndex];

  const options = variants.map((v, i) => ({
    label: v.title || `Option ${i + 1}`,
    value: i,
  }));

  const handleVariantChange = useCallback((idx: number) => {
    onChange({});
    // set index tracking via wrapper key if needed — just clear on switch
    void idx;
    onChange({});
  }, [onChange]);

  return (
    <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
      <Select
        options={options}
        value={selectedIndex}
        onChange={handleVariantChange}
        disabled={disabled}
        style={{ width: '100%', marginBottom: 12 }}
      />
      {selectedVariant?.properties && (
        <SchemaForm
          schema={selectedVariant as Record<string, unknown>}
          value={(currentVal as Record<string, unknown>) ?? {}}
          onChange={onChange}
          disabled={disabled}
          requiredFields={selectedVariant.required}
        />
      )}
    </FieldWrapper>
  );
};

const FieldRenderer = ({
  fieldKey,
  schema,
  value,
  onChange,
  disabled,
  required,
}: FieldRendererProps) => {
  const effectiveType = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  // oneOf / anyOf
  if (schema.oneOf || schema.anyOf) {
    return (
      <OneOfField
        fieldKey={fieldKey}
        schema={schema}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
      />
    );
  }

  // object
  if (effectiveType === 'object' && schema.properties) {
    return (
      <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
        <Card size="small" style={{ marginBottom: 0 }}>
          <SchemaForm
            schema={schema as Record<string, unknown>}
            value={(value as Record<string, unknown>) ?? {}}
            onChange={onChange}
            disabled={disabled}
            requiredFields={schema.required}
          />
        </Card>
      </FieldWrapper>
    );
  }

  // array of objects
  if (effectiveType === 'array' && schema.items && (schema.items as JSONSchemaProperty).type === 'object') {
    return (
      <ArrayOfObjectsField
        fieldKey={fieldKey}
        schema={schema}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
      />
    );
  }

  // array of strings → tags select
  if (effectiveType === 'array') {
    return (
      <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
        <Select
          mode="tags"
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      </FieldWrapper>
    );
  }

  // string with enum → Select
  if (schema.enum) {
    const options = (schema.enum as unknown[]).map((v) => ({
      label: String(v),
      value: v as string | number | boolean,
    }));
    return (
      <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
        <Select
          options={options}
          value={value as string | number | undefined}
          onChange={onChange}
          disabled={disabled}
          style={{ width: '100%' }}
          allowClear
        />
      </FieldWrapper>
    );
  }

  // number / integer
  if (effectiveType === 'number' || effectiveType === 'integer') {
    return (
      <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
        <InputNumber
          value={value as number | undefined}
          onChange={onChange}
          min={schema.minimum}
          max={schema.maximum}
          precision={effectiveType === 'integer' ? 0 : undefined}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      </FieldWrapper>
    );
  }

  // boolean
  if (effectiveType === 'boolean') {
    return (
      <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
        <Switch
          checked={!!value}
          onChange={onChange}
          disabled={disabled}
        />
      </FieldWrapper>
    );
  }

  // string (default)
  const maxLength = schema.maxLength;
  const useTextArea = typeof maxLength === 'number' && maxLength > 200;

  return (
    <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
      {useTextArea ? (
        <Input.TextArea
          value={value as string | undefined}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          minLength={schema.minLength}
          disabled={disabled}
          autoSize={{ minRows: 3, maxRows: 8 }}
        />
      ) : (
        <Input
          value={value as string | undefined}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          disabled={disabled}
        />
      )}
    </FieldWrapper>
  );
};

export const SchemaForm = ({
  schema,
  value,
  onChange,
  disabled,
  requiredFields,
}: SchemaFormProps) => {
  const s = schema as JSONSchemaProperty;
  const properties = s.properties;

  if (!properties) return null;

  const required = requiredFields ?? s.required ?? [];

  return (
    <div>
      {Object.entries(properties).map(([key, propSchema]) => {
        const fieldValue = value[key] ?? (propSchema as JSONSchemaProperty).default;
        const isRequired = required.includes(key);

        const handleChange = (val: unknown) => {
          onChange({ ...value, [key]: val });
        };

        return (
          <FieldRenderer
            key={key}
            fieldKey={key}
            schema={propSchema as JSONSchemaProperty}
            value={fieldValue}
            onChange={handleChange}
            disabled={disabled}
            required={isRequired}
          />
        );
      })}
    </div>
  );
};
