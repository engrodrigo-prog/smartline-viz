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
      className="p-6 h-full cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
      onClick={() => onClick(fileType)}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold text-base leading-tight">{fileType.label}</h3>
            {fileType.subtitle && (
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {fileType.subtitle}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground flex-1">
          {fileType.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FileIcon className="w-3 h-3" />
            {fileType.acceptedFormats.join(", ")}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Card>
  );
}
