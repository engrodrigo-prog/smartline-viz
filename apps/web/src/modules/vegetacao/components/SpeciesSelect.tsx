import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VEG_SPECIES_CATALOG, type VegSpeciesItem, findVegSpeciesByCommonName } from "@/modules/vegetacao/constants/species";

export function SpeciesSelect({
  value,
  onChange,
  placeholder = "Selecione…",
  allowEmpty = true,
}: {
  value: VegSpeciesItem | null;
  onChange: (next: VegSpeciesItem | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const currentValue = value?.commonName ?? (allowEmpty ? "none" : "");

  return (
    <Select
      value={currentValue}
      onValueChange={(v) => {
        if (allowEmpty && v === "none") {
          onChange(null);
          return;
        }
        const found = findVegSpeciesByCommonName(v);
        if (found) onChange(found);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? <SelectItem value="none">—</SelectItem> : null}
        {VEG_SPECIES_CATALOG.map((s) => (
          <SelectItem key={s.commonName} value={s.commonName}>
            {s.commonName} — <span className="text-muted-foreground">{s.scientificName}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default SpeciesSelect;

