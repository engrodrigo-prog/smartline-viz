import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleLayout from '@/components/ModuleLayout';
import { Leaf, Mountain, AlertTriangle, Building } from 'lucide-react';
import ErosaoRisco from './ErosaoRisco';
import InvasaoFaixa from './InvasaoFaixa';
import AlertasAmbiente from './AlertasAmbiente';

export default function AmbienteModule() {
  return (
    <ModuleLayout title="Módulo Ambiente" icon={Leaf}>
      <Tabs defaultValue="erosao" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="erosao" className="flex items-center gap-2">
            <Mountain className="w-4 h-4" />
            Erosão
          </TabsTrigger>
          <TabsTrigger value="invasao" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Ocupações Irregulares
          </TabsTrigger>
          <TabsTrigger value="alertas" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertas & Mudanças
          </TabsTrigger>
        </TabsList>

        <TabsContent value="erosao" className="mt-6">
          <ErosaoRisco />
        </TabsContent>

        <TabsContent value="invasao" className="mt-6">
          <InvasaoFaixa />
        </TabsContent>

        <TabsContent value="alertas" className="mt-6">
          <AlertasAmbiente />
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
