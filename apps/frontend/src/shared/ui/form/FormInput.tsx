import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useId,
} from 'react';
import {
  useController,
  useFormContext,
  type FieldPathByValue,
  type FieldValues,
} from 'react-hook-form';

import { getFieldErrorId } from './fieldIds';
import { FormField, type FormErrorFormatter } from './FormField';

type InputValue = ComponentPropsWithoutRef<'input'>['value'];

type FormInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPathByValue<TFieldValues, InputValue> = FieldPathByValue<
    TFieldValues,
    InputValue
  >,
> = Omit<
  ComponentPropsWithoutRef<'input'>,
  'defaultValue' | 'name' | 'value'
> & {
  endAdornment?: ReactNode;
  formatError?: FormErrorFormatter;
  icon?: ReactNode;
  label: string;
  name: TName;
};

export function FormInput<
  TFieldValues extends FieldValues,
  TName extends FieldPathByValue<TFieldValues, InputValue> = FieldPathByValue<
    TFieldValues,
    InputValue
  >,
>({
  endAdornment,
  formatError,
  icon,
  label,
  name,
  onBlur,
  onChange,
  className,
  dir,
  type,
  'aria-describedby': ariaDescribedBy,
  ...inputProps
}: FormInputProps<TFieldValues, TName>) {
  const generatedId = useId();
  const id = `form-input-${String(name).replaceAll('.', '-')}-${generatedId}`;
  const { control } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({ control, name });
  const error = fieldState.error?.message;
  const describedBy = [ariaDescribedBy, error ? getFieldErrorId(id) : undefined]
    .filter(Boolean)
    .join(' ');
  const inputClassName = [
    'min-h-10 w-full border-0 bg-transparent py-0 text-foreground outline-none placeholder:text-muted-foreground/70',
    icon ? 'ps-9' : 'ps-3.5',
    endAdornment ? 'pe-[42px]' : 'pe-3.5',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const inputDirection = dir ?? (type === 'email' ? 'ltr' : undefined);

  return (
    <FormField
      error={error}
      formatError={formatError}
      htmlFor={id}
      icon={icon}
      label={label}
    >
      <input
        {...inputProps}
        aria-describedby={describedBy || undefined}
        className={inputClassName}
        dir={inputDirection}
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
        ref={field.ref}
        type={type}
        value={(field.value ?? '') as InputValue}
      />
      {endAdornment ? (
        <span className="absolute end-[5px] top-1/2 inline-flex -translate-y-1/2">
          {endAdornment}
        </span>
      ) : null}
    </FormField>
  );
}
