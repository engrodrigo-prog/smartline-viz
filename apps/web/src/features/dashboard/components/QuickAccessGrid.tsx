import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export type QuickAccessItem = {
  id: string;
  title: string;
  description: string;
  to: string;
  Icon: LucideIcon;
  iconWrapperClass: string;
  iconClass: string;
};

type QuickAccessGridProps = {
  links: QuickAccessItem[];
};

const QuickAccessGrid = ({ links }: QuickAccessGridProps) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {links.map((link) => (
      <Link key={link.id} to={link.to} className="tech-card p-6 hover:scale-[1.02] transition-transform">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`p-4 rounded-2xl ${link.iconWrapperClass}`}>
            <link.Icon className={`w-8 h-8 ${link.iconClass}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">{link.title}</h3>
            <p className="text-xs text-muted-foreground">{link.description}</p>
          </div>
        </div>
      </Link>
    ))}
  </div>
);

export default QuickAccessGrid;
