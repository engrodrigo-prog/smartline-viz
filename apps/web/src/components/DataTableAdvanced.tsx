import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableAdvancedProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
  pageSize?: number;
  exportable?: boolean;
}

const DataTableAdvanced = ({
  data,
  columns,
  onRowClick,
  pageSize = 20,
  exportable = false,
}: DataTableAdvancedProps) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const handleExport = () => {
    const headers = columns.map(col => col.label).join(',');
    const rows = sortedData.map(row => 
      columns.map(col => {
        const value = row[col.key];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 ml-1 text-primary" />
      : <ChevronDown className="w-4 h-4 ml-1 text-primary" />;
  };

  return (
    <div className="tech-card">
      {exportable && (
        <div className="p-4 border-b border-border flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-sm font-semibold ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-muted/70' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  Nenhum resultado encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-muted/30" : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} resultados
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTableAdvanced;
