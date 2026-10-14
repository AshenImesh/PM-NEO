import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { classNames } from '@utils/helpers';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {}
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldProps {}

function FieldShell({
  label,
  error,
  hint,
  id,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {hint && !error && <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? `field-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <FieldShell label={label} error={error} hint={hint} id={inputId}>
        <input
          ref={ref}
          id={inputId}
          className={classNames('input', error && 'border-red-500 focus:ring-red-500', className)}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
      </FieldShell>
    );
  }
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? `field-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <FieldShell label={label} error={error} hint={hint} id={inputId}>
        <textarea
          ref={ref}
          id={inputId}
          className={classNames('input resize-y min-h-[80px]', error && 'border-red-500 focus:ring-red-500', className)}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
      </FieldShell>
    );
  }
);
Textarea.displayName = 'Textarea';
