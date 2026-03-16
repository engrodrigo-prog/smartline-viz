import JSZip from "jszip";

export type QgisLayerIngestionTarget =
  | "postgres_live"
  | "vector_import"
  | "raster_import"
  | "external_service"
  | "manual_review";

export type QgisProjectLayer = {
  id: string;
  name: string;
  groupPath: string[];
  order: number;
  visible: boolean;
  provider: string;
  source: string;
  sourceFileName: string | null;
  geometryType: string;
  rendererType: string;
  fillColor: string | null;
  strokeColor: string | null;
  ingestionTarget: QgisLayerIngestionTarget;
  ingestionLabel: string;
};

export type QgisProjectSummary = {
  projectName: string;
  projectFileName: string;
  layerCount: number;
  layers: QgisProjectLayer[];
  referencedFiles: Array<{
    name: string;
    kind: "vector" | "raster" | "service" | "database" | "other";
    ingestionTarget: QgisLayerIngestionTarget;
  }>;
};

const geometryTypeMap: Record<string, string> = {
  "-1": "Raster",
  "0": "Point",
  "1": "LineString",
  "2": "Polygon",
  "3": "Unknown",
  "4": "NoGeometry",
};

const splitDatasource = (value: string) => value.split("|")[0]?.trim() ?? "";

const pickFileName = (datasource: string) => {
  const clean = splitDatasource(datasource);
  if (!clean) return null;
  if (/^(dbname=|service=|postgres)/i.test(clean)) return null;
  if (/^(http|https|wms|wfs|xyz):/i.test(clean)) return null;
  const normalized = clean.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || null;
};

const toCssColor = (raw: string | null | undefined) => {
  if (!raw) return null;
  if (raw.startsWith("#")) return raw;
  const parts = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
  if (parts.length < 3) return null;
  const [r, g, b, a = 255] = parts;
  const alpha = Math.max(0, Math.min(1, a / 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
};

const extractSymbolColors = (layerElement: Element) => {
  const renderer = layerElement.querySelector("renderer-v2");
  if (!renderer) {
    return { fillColor: null, strokeColor: null, rendererType: "default" };
  }

  const values = new Map<string, string>();
  renderer.querySelectorAll("prop").forEach((node) => {
    const key = node.getAttribute("k");
    const value = node.getAttribute("v");
    if (key && value) values.set(key, value);
  });
  renderer.querySelectorAll("Option").forEach((node) => {
    const key = node.getAttribute("name");
    const value = node.getAttribute("value");
    if (key && value) values.set(key, value);
  });

  return {
    rendererType: renderer.getAttribute("type") || "singleSymbol",
    fillColor:
      toCssColor(values.get("color")) ??
      toCssColor(values.get("fill")) ??
      toCssColor(values.get("fill_color")),
    strokeColor:
      toCssColor(values.get("outline_color")) ??
      toCssColor(values.get("line_color")) ??
      toCssColor(values.get("stroke_color")) ??
      toCssColor(values.get("color_border")),
  };
};

const inferIngestionTarget = (provider: string, source: string, geometryType: string) => {
  const cleanProvider = provider.toLowerCase();
  const cleanSource = splitDatasource(source).toLowerCase();

  if (cleanProvider === "postgres" || /^(dbname=|service=|postgres)/i.test(cleanSource)) {
    return {
      target: "postgres_live" as const,
      label: "PostGIS live / já conectado",
    };
  }

  if (/^(http|https|wms|wfs|xyz):/i.test(cleanSource) || ["wms", "wfs", "arcgismapserver"].includes(cleanProvider)) {
    return {
      target: "external_service" as const,
      label: "Serviço externo referenciado",
    };
  }

  if (cleanProvider === "gdal" || /\.(tif|tiff|vrt|cog\.tif)$/i.test(cleanSource) || geometryType === "Raster") {
    return {
      target: "raster_import" as const,
      label: "Raster -> COG / catálogo raster",
    };
  }

  if (
    cleanProvider === "ogr" ||
    /\.(gpkg|shp|zip|geojson|json|kml|kmz)$/i.test(cleanSource)
  ) {
    return {
      target: "vector_import" as const,
      label: "Vetor -> staging / PostGIS",
    };
  }

  return {
    target: "manual_review" as const,
    label: "Revisão manual",
  };
};

const readGeometryType = (layerElement: Element) => {
  const geometryNode =
    layerElement.querySelector("layerGeometryType") ??
    layerElement.querySelector("geometry") ??
    layerElement.querySelector("wkbType");
  const raw = geometryNode?.textContent?.trim();
  if (!raw) return "Unknown";
  return geometryTypeMap[raw] ?? raw;
};

const readProjectXml = async (file: File) => {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".qgs")) {
    return file.text();
  }

  if (lowerName.endsWith(".qgz")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const projectFile = Object.values(zip.files).find(
      (entry) => !entry.dir && entry.name.toLowerCase().endsWith(".qgs"),
    );
    if (!projectFile) {
      throw new Error("Projeto QGZ inválido: nenhum arquivo .qgs encontrado no pacote.");
    }
    return projectFile.async("text");
  }

  throw new Error("Formato não suportado. Use .qgs ou .qgz.");
};

const buildLayerTreeOrder = (root: Element | null) => {
  const ordered: Array<{ id: string; name: string; groupPath: string[]; visible: boolean }> = [];

  const walk = (node: Element, parents: string[]) => {
    Array.from(node.children).forEach((child) => {
      if (child.tagName === "layer-tree-group") {
        const groupName = child.getAttribute("name")?.trim();
        walk(child, groupName ? [...parents, groupName] : parents);
        return;
      }

      if (child.tagName === "layer-tree-layer") {
        ordered.push({
          id: child.getAttribute("id") ?? "",
          name: child.getAttribute("name") ?? "Sem nome",
          groupPath: parents,
          visible: child.getAttribute("checked") !== "Qt::Unchecked",
        });
      }
    });
  };

  if (root) {
    walk(root, []);
  }

  return ordered;
};

export const parseQgisProject = async (file: File): Promise<QgisProjectSummary> => {
  const xml = await readProjectXml(file);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (!doc) {
    throw new Error("Não foi possível interpretar o XML do projeto QGIS.");
  }

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Projeto QGIS inválido ou corrompido.");
  }

  const projectRoot = doc.querySelector("qgis");
  const projectName =
    projectRoot?.getAttribute("projectname")?.trim() ||
    doc.querySelector("title")?.textContent?.trim() ||
    file.name.replace(/\.(qgs|qgz)$/i, "");

  const mapLayerElements = Array.from(doc.querySelectorAll("projectlayers > maplayer, maplayers > maplayer"));
  const layersById = new Map<string, QgisProjectLayer>();

  mapLayerElements.forEach((layerElement, index) => {
    const id = layerElement.querySelector("id")?.textContent?.trim() || `layer-${index + 1}`;
    const name = layerElement.querySelector("layername")?.textContent?.trim() || `Camada ${index + 1}`;
    const provider = layerElement.querySelector("provider")?.textContent?.trim() || "unknown";
    const source = layerElement.querySelector("datasource")?.textContent?.trim() || "";
    const geometryType = readGeometryType(layerElement);
    const { fillColor, strokeColor, rendererType } = extractSymbolColors(layerElement);
    const { target, label } = inferIngestionTarget(provider, source, geometryType);

    layersById.set(id, {
      id,
      name,
      groupPath: [],
      order: index + 1,
      visible: true,
      provider,
      source,
      sourceFileName: pickFileName(source),
      geometryType,
      rendererType,
      fillColor,
      strokeColor,
      ingestionTarget: target,
      ingestionLabel: label,
    });
  });

  const layerTreeRoot =
    doc.querySelector("layer-tree-group") ??
    doc.querySelector("layer-tree-canvas > layer-tree-group") ??
    doc.querySelector("layer-tree-root");
  const orderedTree = buildLayerTreeOrder(layerTreeRoot);

  const orderedLayers = orderedTree.length
    ? orderedTree
        .map((treeLayer, index) => {
          const layer = layersById.get(treeLayer.id);
          if (!layer) return null;
          return {
            ...layer,
            name: treeLayer.name || layer.name,
            groupPath: treeLayer.groupPath,
            visible: treeLayer.visible,
            order: index + 1,
          };
        })
        .filter((layer): layer is QgisProjectLayer => Boolean(layer))
    : Array.from(layersById.values()).sort((left, right) => left.order - right.order);

  const referencedFiles = Array.from(
    new Map(
      orderedLayers
        .map((layer) => {
          const name = layer.sourceFileName ?? layer.source ?? layer.name;
          const kind =
            layer.ingestionTarget === "vector_import"
              ? "vector"
              : layer.ingestionTarget === "raster_import"
                ? "raster"
                : layer.ingestionTarget === "external_service"
                  ? "service"
                  : layer.ingestionTarget === "postgres_live"
                    ? "database"
                    : "other";
          return [name, { name, kind, ingestionTarget: layer.ingestionTarget }] as const;
        }),
    ).values(),
  );

  return {
    projectName,
    projectFileName: file.name,
    layerCount: orderedLayers.length,
    layers: orderedLayers,
    referencedFiles,
  };
};
