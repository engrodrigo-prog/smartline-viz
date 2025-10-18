import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, getFileTypesByCategory, type FileType } from "@/lib/uploadConfig";

interface FileTypeSelectorProps {
  selectedCategory: string;
  selectedFileType: string;
  onCategoryChange: (category: string) => void;
  onFileTypeChange: (fileType: string) => void;
}

export function FileTypeSelector({
  selectedCategory,
  selectedFileType,
  onCategoryChange,
  onFileTypeChange
}: FileTypeSelectorProps) {
  const fileTypes = selectedCategory ? getFileTypesByCategory(selectedCategory) : [];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          1. Selecione a Categoria
        </label>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha o tipo de dado..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && (
        <div>
          <label className="text-sm font-medium mb-2 block">
            2. Selecione o Tipo de Arquivo
          </label>
          <Select 
            value={selectedFileType}
            onValueChange={onFileTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha o arquivo específico..." />
            </SelectTrigger>
            <SelectContent>
              {fileTypes.map(ft => (
                <SelectItem key={ft.id} value={ft.id}>
                  <div className="flex items-center gap-2">
                    <ft.icon className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{ft.label}</div>
                      {ft.subtitle && (
                        <div className="text-xs text-muted-foreground">{ft.subtitle}</div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fileTypes.find(ft => ft.id === selectedFileType) && (
            <p className="text-sm text-muted-foreground mt-2">
              {fileTypes.find(ft => ft.id === selectedFileType)?.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
