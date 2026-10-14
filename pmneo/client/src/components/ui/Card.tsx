import type { ReactNode } from 'react';
import { classNames } from '@utils/helpers';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classNames('surface-soft', className)}>{children}</div>;
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classNames('card-header', className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classNames('card-body', className)}>{children}</div>;
}
