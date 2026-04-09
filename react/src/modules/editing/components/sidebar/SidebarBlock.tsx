import type { ReactNode } from 'react';

interface SidebarBlockProps {
  title: string;
  children: ReactNode;
}

export default function SidebarBlock({ title, children }: SidebarBlockProps) {
  return (
    <section className="sidebar-card">
      <h3 className="sidebar-card__title">{title}</h3>
      <div className="sidebar-card__body">{children}</div>
    </section>
  );
}
