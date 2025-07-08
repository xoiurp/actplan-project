import React, { ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { Separator } from './ui/separator';
import { useSidebar } from './ui/sidebar';

interface HeaderProps {
  title: string;
  actions?: ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="bg-white group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear rounded-lg px-0 md:px-6">
      <div className="flex w-full items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-7 w-7 -ml-1"
            data-sidebar="trigger"
          >
            <PanelLeft className="h-4 w-4" />
            <span className="sr-only">Toggle Sidebar</span>
          </button>
          <Separator orientation="vertical" className="h-4 mx-2" />
          <h1 className="text-base font-medium">{title}</h1>
        </div>
        {actions}
      </div>
    </header>
  );
}