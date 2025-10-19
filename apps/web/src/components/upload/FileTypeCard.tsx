import { Card } from "@/components/ui/card";
import { ChevronRight, FileIcon } from "lucide-react";
import type { FileType } from "@/lib/uploadConfig";

interface FileTypeCardProps {
  fileType: FileType;
  onClick: (fileType: FileType) => void;
}

export function FileTypeCard({ fileType, onClick }: FileTypeCardProps) {
  const Icon = fileType.icon;
  
  return (
    <Card 
      className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
      onClick={() => onClick(fileType)}
    >
      <div className="flex items-start gap-4">
        {/* Icon Badge */}
        <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-lg">{fileType.label}</h3>
            {fileType.subtitle && (
              <span className="text-xs text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded">
                {fileType.subtitle}
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {fileType.description}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileIcon className="w-3 h-3" />
            <span>{fileType.acceptedFormats.join(', ')}</span>
          </div>
        </div>
        
        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Card>
  );
}
