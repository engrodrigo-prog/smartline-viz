import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FileType } from "@/lib/uploadConfig";

interface AdditionalFieldsFormProps {
  fileType: FileType;
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function AdditionalFieldsForm({ fileType, values, onChange }: AdditionalFieldsFormProps) {
  if (!fileType.requiredFields || fileType.requiredFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Campos Obrigatórios</h3>
      
      {fileType.requiredFields.includes('line_code') && (
        <div>
          <Label htmlFor="line_code">Código da Linha *</Label>
          <Input
            id="line_code"
            placeholder="Ex: LT-138kV-Campo-Grande"
            value={values.line_code || ''}
            onChange={(e) => onChange('line_code', e.target.value)}
            required
          />
        </div>
      )}

      {fileType.requiredFields.includes('x_left') && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="x_left">Largura Esquerda (m) *</Label>
            <Input
              id="x_left"
              type="number"
              min="0"
              max="10000"
              placeholder="Ex: 100"
              value={values.x_left || ''}
              onChange={(e) => onChange('x_left', parseFloat(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="x_right">Largura Direita (m) *</Label>
            <Input
              id="x_right"
              type="number"
              min="0"
              max="10000"
              placeholder="Ex: 100"
              value={values.x_right || ''}
              onChange={(e) => onChange('x_right', parseFloat(e.target.value))}
              required
            />
          </div>
        </div>
      )}

      {fileType.requiredFields.includes('concessao') && (
        <div>
          <Label htmlFor="concessao">Concessão *</Label>
          <Input
            id="concessao"
            placeholder="Ex: CPFL Piratininga"
            value={values.concessao || ''}
            onChange={(e) => onChange('concessao', e.target.value)}
            required
          />
        </div>
      )}

      {fileType.requiredFields.includes('gsd_cm') && (
        <div>
          <Label htmlFor="gsd_cm">Resolução GSD (cm) *</Label>
          <Input
            id="gsd_cm"
            type="number"
            min="1"
            max="1000"
            placeholder="Ex: 10"
            value={values.gsd_cm || ''}
            onChange={(e) => onChange('gsd_cm', parseInt(e.target.value))}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ground Sample Distance - tamanho do pixel em centímetros
          </p>
        </div>
      )}
    </div>
  );
}
