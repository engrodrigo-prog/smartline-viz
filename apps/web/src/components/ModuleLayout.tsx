import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { LucideIcon } from "lucide-react";

interface ModuleLayoutProps {
  children: ReactNode;
  title: string;
  icon: LucideIcon;
}

const ModuleLayout = ({ children, title, icon: Icon }: ModuleLayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <Icon className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">{title}</h1>
            </div>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ModuleLayout;
