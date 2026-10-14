import { useState, useRef } from 'react';
import { classNames } from '@utils/helpers';
import { useClickOutside } from '@hooks/useDragAndDrop';
import { getInitials } from '@utils/helpers';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'gray';

export function Badge({
  children,
  variant = 'gray',
  dot,
  dotColor,
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  dotColor?: string;
  className?: string;
}) {
  const variantClasses: Record<BadgeVariant, string> = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    purple: 'badge-purple',
    gray: 'badge-gray',
  };
  return (
    <span className={classNames('badge', variantClasses[variant], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor || 'currentColor' }} />}
      {children}
    </span>
  );
}

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-pink-500',
];

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };
  const idx = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <span
      title={name}
      className={classNames(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        AVATAR_COLORS[idx],
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name || '?')}
    </span>
  );
}

export function Dropdown({
  trigger,
  items,
  align = 'right',
}: {
  trigger: React.ReactNode;
  items: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
  }>;
  align?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setIsOpen(v => !v)}>{trigger}</div>
      {isOpen && (
        <div
          className={classNames(
            'absolute z-50 mt-1.5 w-52 rounded-xl border border-dark-200 bg-white py-1.5 shadow-elevated animate-in',
            'dark:bg-dark-900 dark:border-dark-700',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={classNames(
                'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors',
                item.danger
                  ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                  : 'text-dark-700 hover:bg-dark-50 dark:text-dark-200 dark:hover:bg-dark-800',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              role="menuitem"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="w-12 h-12 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-400 dark:text-dark-500 mb-4">
        {icon}
      </div>
      <p className="font-semibold text-dark-900 dark:text-white">{title}</p>
      {hint && <p className="text-sm text-dark-500 dark:text-dark-400 mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={classNames('h-1.5 rounded-full bg-dark-100 dark:bg-dark-800 overflow-hidden', className)}>
      <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-dark-200 bg-dark-50 p-1 dark:bg-dark-900 dark:border-dark-700">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={classNames(
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            value === o.value
              ? 'bg-white text-dark-900 shadow-card dark:bg-dark-700 dark:text-white dark:shadow-none dark:ring-1 dark:ring-inset dark:ring-dark-600'
              : 'text-dark-500 hover:text-dark-800 dark:text-dark-400 dark:hover:text-dark-100'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
