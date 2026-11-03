import { type ComponentPropsWithRef, type ReactNode, type Ref, useId } from 'react';
import {
  useController,
  useFormContext,
  type FieldPathByValue,
  type FieldValues,
} from 'react-hook-form';

import { getFieldErrorId } from './fieldIds';
import { FormField, type FormErrorFormatter } from './FormField';

type TextareaValue = ComponentPropsWithRef<'textarea'>['value'];
type TextareaFieldValue = TextareaValue | null;

type FormTextareaProps<
  TFieldValues extends FieldValues,
  TName extends FieldPathByValue<TFieldValues, TextareaFieldValue> = FieldPathByValue<
    TFieldValues,
    TextareaFieldValue
  >,
> = Omit<ComponentPropsWithRef<'textarea'>, 'defaultValue' | 'name' | 'value'> & {
  formatError?: FormErrorFormatter;
  icon?: ReactNode;
  label: string;
  name: TName;
};

export function FormTextarea<
  TFieldValues extends FieldValues,
  TName extends FieldPathByValue<TFieldValues, TextareaFieldValue> = FieldPathByValue<
    TFieldValues,
    TextareaFieldValue
  >,
>({
  formatError,
  icon,
  label,
  name,
  onBlur,
  onChange,
  className,
  ref,
  'aria-describedby': ariaDescribedBy,
  ...textareaProps
}: FormTextareaProps<TFieldValues, TName>) {
  const generatedId = useId();
  const id = `form-textarea-${String(name).replaceAll('.', '-')}-${generatedId}`;
  const { control } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({ control, name });
  const error = fieldState.error?.message;
  const describedBy = [ariaDescribedBy, error ? getFieldErrorId(id) : undefined]
    .filter(Boolean)
    .join(' ');
  const textareaClassName = [
    'min-h-20 w-full resize-y border-0 bg-transparent px-3.5 py-2.5 text-foreground outline-none placeholder:text-muted-foreground/70',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FormField error={error} formatError={formatError} htmlFor={id} icon={icon} label={label}>
      <textarea
        {...textareaProps}
        aria-describedby={describedBy || undefined}
        className={textareaClassName}
        id={id}
        name={field.name}
        onBlur={(event) => {
          field.onBlur();
          onBlur?.(event);
        }}
        onChange={(event) => {
          field.onChange(event);
          onChange?.(event);
        }}
        ref={(element) => {
          field.ref(element);
          assignRef(ref, element);
        }}
        value={(field.value ?? '') as TextareaValue}
      />
    </FormField>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}
