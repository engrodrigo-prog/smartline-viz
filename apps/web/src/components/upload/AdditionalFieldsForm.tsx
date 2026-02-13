import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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

  const integrationTargets = fileType.integrationTargets ?? [
    { value: "smartline", label: "Somente SmartLine" },
    { value: "adms", label: "Exportar para ADMS" },
    { value: "supervisory", label: "Integração Supervisório" }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Campos Obrigatórios</h3>
      
      {fileType.requiredFields.includes('name') && (
        <div>
          <Label htmlFor="name">Identificação *</Label>
          <Input
            id="name"
            placeholder="Ex: Diagrama 138kV - LT Norte"
            value={values.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            required
          />
        </div>
      )}

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
            onChange={(e) => {
              const value = e.target.value;
              onChange('x_left', value === '' ? '' : Number(value));
            }}
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
            onChange={(e) => {
              const value = e.target.value;
              onChange('x_right', value === '' ? '' : Number(value));
            }}
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
            onChange={(e) => {
              const value = e.target.value;
              onChange('gsd_cm', value === '' ? '' : Number(value));
            }}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ground Sample Distance - tamanho do pixel em centímetros
          </p>
        </div>
      )}

      {fileType.requiredFields.includes('integration_target') && (
        <div className="space-y-1.5">
          <Label htmlFor="integration_target">Destino de Integração *</Label>
          <Select
            value={values.integration_target ?? ''}
            onValueChange={(value) => onChange('integration_target', value)}
            required
          >
            <SelectTrigger id="integration_target">
              <SelectValue placeholder="Selecione o destino" />
            </SelectTrigger>
            <SelectContent>
              {integrationTargets.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-[11px] text-muted-foreground">{option.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
