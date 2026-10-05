import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import { Icon, type IconName } from './icons'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconName
  label: string
  active?: boolean
  size?: 'md' | 'lg'
  filled?: boolean
}

/** Round icon button with a 44px+ touch target. */
export function IconButton({ icon, label, active, size = 'md', filled, className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
        size === 'lg' ? 'size-16 bg-accent text-accent-fg shadow-panel hover:opacity-90' : 'size-11 text-foreground hover:bg-surface-muted',
        active && size === 'md' && 'text-heart',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'lg' ? 28 : 22} filled={filled} />
    </button>
  )
}
