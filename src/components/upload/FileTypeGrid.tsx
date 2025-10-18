import { FileTypeCard } from "./FileTypeCard";
import type { FileType } from "@/lib/uploadConfig";
import { CATEGORIES } from "@/lib/uploadConfig";

interface FileTypeGridProps {
  category: string;
  fileTypes: FileType[];
  onSelect: (fileType: FileType) => void;
}

export function FileTypeGrid({ category, fileTypes, onSelect }: FileTypeGridProps) {
  if (fileTypes.length === 0) return null;

  const categoryConfig: Record<string, { emoji: string; cols: number }> = {
    'linha': { emoji: '📍', cols: 1 },
    'estrutura': { emoji: '🗼', cols: 1 },
    'analise': { emoji: '📏', cols: 1 },
    'perigo': { emoji: '⚠️', cols: 2 },
    'outros': { emoji: '🗺️', cols: 2 }
  };

  const config = categoryConfig[category];
  const categoryLabel = CATEGORIES.find(c => c.value === category)?.label || category;
  
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>{config?.emoji}</span>
        <span className="uppercase tracking-wide">{categoryLabel}</span>
      </h2>
      
      <div className={`grid gap-4 ${config?.cols === 2 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {fileTypes.map(fileType => (
          <FileTypeCard 
            key={fileType.id} 
            fileType={fileType}
            onClick={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
