import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PrototypeBadge from "./PrototypeBadge";
import DemoNav from "./DemoNav";
import { ENV } from "@/config/env";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const AppLayout = ({ children, title, subtitle }: AppLayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PrototypeBadge />
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        {ENV.DEMO_MODE && <DemoNav />}
        
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
