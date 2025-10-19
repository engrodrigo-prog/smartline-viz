import { Badge } from "@/components/ui/badge";
import { MapPin, Route, Home, AlertCircle } from "lucide-react";

interface Feature {
  type: string;
  name: string;
  geometry: string;
  coordsCount?: number;
  coords?: { lon: number; lat: number };
}

interface GeodataClassificationTableProps {
  features: Feature[];
  classifications: Record<string, { classification: string; customClassification?: string }>;
  onClassificationChange: (index: string, classification: string) => void;
  onCustomClassificationChange: (index: string, customClassification: string) => void;
}

const GeodataClassificationTable = ({
  features,
  classifications,
  onClassificationChange,
  onCustomClassificationChange,
}: GeodataClassificationTableProps) => {
  const getIcon = (type: string) => {
    if (type === 'Point') return <MapPin className="w-4 h-4" />;
    if (type === 'LineString') return <Route className="w-4 h-4" />;
    return <Home className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Classifique cada feature detectada
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
              Selecione o tipo apropriado para cada geometria. Isso determinará em qual tabela os dados serão inseridos.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Classificação</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {features.map((feature, idx) => {
              const key = `${idx}`;
              const classification = classifications[key];

              return (
                <tr key={key} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getIcon(feature.type)}
                      <Badge variant="outline">{feature.type}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{feature.name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={classification?.classification || ''}
                      onChange={(e) => onClassificationChange(key, e.target.value)}
                      className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="linha">Linha de Transmissão</option>
                      <option value="linha_estrutura">Linha + Estruturas</option>
                      <option value="estrutura">Estrutura Individual</option>
                      <option value="evento">Local de Evento/Ocorrência</option>
                      <option value="outros">Outros</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {(classification?.classification === 'evento' || classification?.classification === 'outros') && (
                      <input
                        type="text"
                        placeholder={classification.classification === 'evento' ? 'Tipo de evento' : 'Categoria'}
                        value={classification?.customClassification || ''}
                        onChange={(e) => onCustomClassificationChange(key, e.target.value)}
                        className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GeodataClassificationTable;