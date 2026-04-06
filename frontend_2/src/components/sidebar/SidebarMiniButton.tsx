import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface SidebarMiniButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export default function SidebarMiniButton({
  active = false,
  children,
  className = '',
  type = 'button',
  ...props
}: SidebarMiniButtonProps) {
  return (
    <button
      type={type}
      className={`sidebar-mini-btn ${active ? 'sidebar-mini-btn--active' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
