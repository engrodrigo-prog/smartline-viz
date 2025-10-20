import { FileTypeCard } from "./FileTypeCard";
import type { FileType } from "@/lib/uploadConfig";
import { CATEGORIES } from "@/lib/uploadConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FileTypeGridProps {
  category: string;
  fileTypes: FileType[];
  onSelect: (fileType: FileType) => void;
}

export function FileTypeGrid({ category, fileTypes, onSelect }: FileTypeGridProps) {
  if (fileTypes.length === 0) return null;

  const categoryConfig: Record<
    string,
    {
      emoji: string;
      highlight: string;
      description: string;
    }
  > = {
    linha: {
      emoji: "📍",
      highlight: "Linha",
      description: "Bases geométricas principais"
    },
    estrutura: {
      emoji: "🗼",
      highlight: "Estrutura",
      description: "Ativos fixos (torres, suportes)"
    },
    analise: {
      emoji: "📏",
      highlight: "Análise",
      description: "Planilhas técnicas e métricas"
    },
    perigo: {
      emoji: "⚠️",
      highlight: "Perigo",
      description: "Eventos de risco e ocorrências"
    },
    outros: {
      emoji: "🗺️",
      highlight: "Diversos",
      description: "Materiais complementares"
    }
  };

  const config = categoryConfig[category];
  const categoryLabel = CATEGORIES.find(c => c.value === category)?.label || category;
  
  return (
    <section className="mb-10">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <span className="text-xl">{config?.emoji}</span>
              <span>{categoryLabel}</span>
            </CardTitle>
            <Badge variant="secondary" className="uppercase tracking-wide text-[10px]">
              {fileTypes.length} opções
            </Badge>
          </div>
          {config?.description && (
            <CardDescription className="text-xs sm:text-sm">
              {config.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {fileTypes.map(fileType => (
              <FileTypeCard
                key={fileType.id}
                fileType={fileType}
                onClick={onSelect}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
