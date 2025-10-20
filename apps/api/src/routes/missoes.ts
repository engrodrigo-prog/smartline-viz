import { Hono } from "hono";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, createWriteStream, createReadStream } from "node:fs";
import { join } from "node:path";
import { nanoid } from "nanoid";
import type { FeatureCollection, Feature, LineString } from "geojson";
import nodemailer from "nodemailer";
import { env } from "../env.js";
import yazl from "yazl";

const BASE_DIR = join(process.cwd(), "apps/api/.data/missoes");

type MissionTypeId = "LiDAR_Corredor" | "Circular_Torre" | "Eletromec_Fina" | "Express_Faixa";

type MissionTypeField = {
  chave: string;
  titulo: string;
  tipo: "number" | "string" | "boolean" | "select";
  unidade?: string;
  minimo?: number;
  maximo?: number;
  sugestao?: number | string | boolean;
  opcoes?: { valor: string; label: string }[];
};

type MissionTypeDef = {
  id: MissionTypeId;
  titulo: string;
  descricao: string;
  campos: MissionTypeField[];
  recomenda: string[];
};

const missionTypes: MissionTypeDef[] = [
  {
    id: "LiDAR_Corredor",
    titulo: "LiDAR (Corredor)",
    descricao:
      "Plano de voo LiDAR para corredor completo da linha com controle de faixa, sidelap, overlap e altura constante.",
    campos: [
      { chave: "altitude_m", titulo: "Altitude (m)", tipo: "number", minimo: 40, maximo: 180, sugestao: 120 },
      { chave: "velocidade_ms", titulo: "Velocidade (m/s)", tipo: "number", minimo: 2, maximo: 12, sugestao: 6 },
      { chave: "sidelap_percent", titulo: "Sidelap (%)", tipo: "number", minimo: 20, maximo: 80, sugestao: 50 },
      { chave: "overlap_percent", titulo: "Overlap (%)", tipo: "number", minimo: 20, maximo: 80, sugestao: 60 },
      { chave: "corredor_m", titulo: "Largura do corredor (m)", tipo: "number", minimo: 10, maximo: 200, sugestao: 80 }
    ],
    recomenda: ["Verificar condições meteorológicas", "Checar alinhamento com LiPowerline", "Garantir redundância de GNSS"]
  },
  {
    id: "Circular_Torre",
    titulo: "Imagens Circulares de Torres",
    descricao:
      "Missão circular sobre torres com fotos convergentes para gêmeo digital e inspeção visual detalhada.",
    campos: [
      { chave: "raio_m", titulo: "Raio padrão (m)", tipo: "number", minimo: 10, maximo: 80, sugestao: 35 },
      { chave: "altitude_relativa_m", titulo: "Altitude relativa (m)", tipo: "number", minimo: 5, maximo: 120, sugestao: 25 },
      { chave: "intervalo_fotos_deg", titulo: "Intervalo ângulo (°)", tipo: "number", minimo: 5, maximo: 45, sugestao: 15 },
      {
        chave: "sentido",
        titulo: "Sentido de voo",
        tipo: "select",
        opcoes: [
          { valor: "horario", label: "Horário" },
          { valor: "anti_horario", label: "Anti-horário" }
        ],
        sugestao: "anti_horario"
      }
    ],
    recomenda: ["Confirmar altura de estruturas próximas", "Configurar exposição manual para padronizar HDR", "Verificar vento cruzado"]
  },
  {
    id: "Eletromec_Fina",
    titulo: "Inspeção Eletromecânica Fina",
    descricao:
      "Missão de aproximação aos componentes críticos com aproximação lateral, registro termográfico e vídeos estabilizados.",
    campos: [
      { chave: "velocidade_ms", titulo: "Velocidade (m/s)", tipo: "number", minimo: 0.5, maximo: 6, sugestao: 2 },
      { chave: "distancia_lateral_m", titulo: "Distância lateral (m)", tipo: "number", minimo: 2, maximo: 50, sugestao: 8 },
      { chave: "tempo_hover_s", titulo: "Tempo de hover (s)", tipo: "number", minimo: 3, maximo: 30, sugestao: 10 },
      { chave: "capturar_termografia", titulo: "Capturar termografia", tipo: "boolean", sugestao: true }
    ],
    recomenda: ["Sincronizar sensores RGB + IR", "Checar plano de aproximação por face", "Salvar padrões no LiPowerline"]
  },
  {
    id: "Express_Faixa",
    titulo: "Varredura Expressa da Faixa",
    descricao:
      "Missão rápida com fotos em série para avaliação emergencial de faixa, ocupações e quedas de vegetação.",
    campos: [
      { chave: "altitude_m", titulo: "Altitude (m)", tipo: "number", minimo: 30, maximo: 150, sugestao: 70 },
      { chave: "velocidade_ms", titulo: "Velocidade (m/s)", tipo: "number", minimo: 3, maximo: 18, sugestao: 10 },
      { chave: "intervalo_fotos_s", titulo: "Intervalo entre fotos (s)", tipo: "number", minimo: 1, maximo: 5, sugestao: 2 },
      { chave: "modo_obliquo", titulo: "Modo oblíquo", tipo: "boolean", sugestao: false }
    ],
    recomenda: ["Aplicar padrão de nome de mídia", "Configurar mapeamento rápido no LiPowerline", "Validar sensores ativos"]
  }
];

type MissionRecord = {
  id: string;
  tipo: MissionTypeId;
  nome: string;
  parametros: Record<string, unknown>;
  linha?: FeatureCollection | Feature<LineString>;
  waypoints?: FeatureCollection;
  mediaPattern: string;
  criadoEm: string;
  atualizadoEm: string;
  exports: {
    formato: string;
    arquivo: string;
    geradoEm: string;
    email?: string;
  }[];
};

type CreateMissionPayload = {
  tipo: MissionTypeId;
  nome: string;
  linha?: FeatureCollection | Feature<LineString>;
  parametros?: Record<string, unknown>;
  waypoints?: FeatureCollection;
};

type ExportMissionPayload = {
  formato: "DJI" | "Autel" | "Ardupilot" | "KML" | "CSV" | "JSON";
  email?: string;
};

const ensureBaseDir = () => {
  mkdirSync(BASE_DIR, { recursive: true });
};

const missionDir = (id: string) => {
  ensureBaseDir();
  const dir = join(BASE_DIR, id);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "exports"), { recursive: true });
  return dir;
};

const missionFile = (id: string) => join(missionDir(id), "mission.json");

const loadMission = (id: string): MissionRecord | null => {
  const file = missionFile(id);
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, "utf8");
    return JSON.parse(raw) as MissionRecord;
  } catch (error) {
    console.warn(`[missoes] falha ao ler ${file}`, error);
    return null;
  }
};

const saveMission = (mission: MissionRecord) => {
  const file = missionFile(mission.id);
  writeFileSync(file, JSON.stringify(mission, null, 2), "utf8");
};

const generateMediaPattern = (lineId?: string | null, missionId?: string) => {
  const baseLine = (lineId ?? "LINHA").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const baseMission = (missionId ?? "MISSAO").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `{${baseLine}}{${baseMission}}{YYYYMMDD_HHmmss}{lat}{lon}{alt}{seq}`;
};

const extractLineIdentifier = (geometry?: FeatureCollection | Feature<LineString>) => {
  if (!geometry) return undefined;
  if ((geometry as FeatureCollection).type === "FeatureCollection") {
    const first = (geometry as FeatureCollection).features?.find(
      (feature) => typeof feature?.properties?.id === "string" || typeof feature?.properties?.nome === "string"
    );
    if (first?.properties?.id && typeof first.properties.id === "string") {
      return first.properties.id;
    }
    if (first?.properties?.nome && typeof first.properties.nome === "string") {
      return first.properties.nome;
    }
    return undefined;
  }
  if ((geometry as Feature<LineString>).properties) {
    const props = (geometry as Feature<LineString>).properties as Record<string, unknown>;
    if (typeof props?.id === "string") return props.id;
    if (typeof props?.nome === "string") return props.nome as string;
  }
  return undefined;
};

const normaliseMissionPayload = (payload: CreateMissionPayload): MissionRecord => {
  const tipo = missionTypes.find((item) => item.id === payload.tipo);
  if (!tipo) {
    throw new Error("Tipo de missão inválido.");
  }
  const agora = new Date().toISOString();

  const parametros: Record<string, unknown> = {};
  tipo.campos.forEach((campo) => {
    if (payload.parametros && payload.parametros[campo.chave] !== undefined) {
      parametros[campo.chave] = payload.parametros[campo.chave];
    } else if (campo.sugestao !== undefined) {
      parametros[campo.chave] = campo.sugestao;
    }
  });

  const id = `msn_${nanoid(10)}`;

  return {
    id,
    tipo: tipo.id,
    nome: payload.nome.trim(),
    parametros,
    linha: payload.linha,
    waypoints: payload.waypoints,
    mediaPattern: generateMediaPattern(extractLineIdentifier(payload.linha), id),
    criadoEm: agora,
    atualizadoEm: agora,
    exports: []
  };
};

const toLineFeatureCollection = (geometry?: FeatureCollection | Feature<LineString>) => {
  if (!geometry) return null;
  if ((geometry as FeatureCollection).type === "FeatureCollection") {
    return geometry as FeatureCollection;
  }
  if ((geometry as Feature<LineString>).type === "Feature") {
    return {
      type: "FeatureCollection",
      features: [geometry as Feature<LineString>]
    } satisfies FeatureCollection;
  }
  return null;
};

const extractLineCoordinates = (geometry?: FeatureCollection | Feature<LineString>) => {
  const collection = toLineFeatureCollection(geometry);
  if (!collection) return [];
  const coords: [number, number][] = [];
  collection.features.forEach((feature) => {
    if (feature.geometry?.type === "LineString") {
      coords.push(...(feature.geometry.coordinates as [number, number][]));
    }
  });
  return coords;
};

const buildKml = (mission: MissionRecord) => {
  const coords = extractLineCoordinates(mission.linha);
  const coordString = coords.map(([lon, lat]) => `${lon},${lat},0`).join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${mission.nome}</name>
    <Placemark>
      <name>${mission.tipo}</name>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordString}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
};

const buildCsv = (mission: MissionRecord) => {
  const headers = ["seq", "lat", "lon", "alt"];
  const coords = extractLineCoordinates(mission.linha);
  const rows = coords.map(([lon, lat], index) => `${index + 1},${lat},${lon},${mission.parametros["altitude_m"] ?? ""}`);
  return [headers.join(","), ...rows].join("\n");
};

const buildPlanJson = (mission: MissionRecord) => {
  const base = toLineFeatureCollection(mission.linha);
  return JSON.stringify(
    {
      version: "smartline-v1",
      mission: mission.nome,
      type: mission.tipo,
      parametros: mission.parametros,
      linha: base
    },
    null,
    2
  );
};

const buildArdupilotPlan = (mission: MissionRecord) => {
  const coords = extractLineCoordinates(mission.linha);
  const items = coords.map(([lon, lat], index) => ({
    seq: index + 1,
    command: "WAYPOINT",
    frame: "GLOBAL_RELATIVE_ALT",
    params: [
      0,
      0,
      0,
      0,
      lat,
      lon,
      mission.parametros["altitude_m"] ?? mission.parametros["altitude_relativa_m"] ?? 50
    ]
  }));
  return JSON.stringify(
    {
      mission: {
        items,
        plannedHomePosition: coords[0] ?? null
      },
      geoFence: null,
      rallyPoints: null
    },
    null,
    2
  );
};

const hasSmtpConfig = () =>
  Boolean(
    env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM
  );

const sendMissionEmail = async (email: string, mission: MissionRecord, downloadUrl: string) => {
  if (!hasSmtpConfig()) return;
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!
    }
  });
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: `Missão ${mission.nome} pronta para exportação`,
    text: [
      `Olá,`,
      ``,
      `A missão ${mission.nome} (${mission.tipo}) foi processada com sucesso.`,
      `Faça o download do pacote aqui: ${downloadUrl}`,
      ``,
      `Padrão de nomes de mídia: ${mission.mediaPattern}`,
      ``,
      `Equipe SmartLine™`
    ].join("\n")
  });
};

const createMissionZip = async (mission: MissionRecord, formato: ExportMissionPayload["formato"]) => {
  const dir = missionDir(mission.id);
  const zipPath = join(dir, "exports", "mission-package.zip");
  const zip = new yazl.ZipFile();

  const readme = [
    `Smart Line™ | Pacote de Missão`,
    `Missão: ${mission.nome} (${mission.tipo})`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ``,
    `Copie o pacote para o cartão SD/USB do controlador ou da aeronave conforme o fabricante.`,
    `Padrão de nomes de mídia obrigatório para integração com LiPowerline:`,
    mission.mediaPattern,
    ``,
    `Formatos incluídos: mission.json, mission.${formato.toLowerCase()}`,
    `README.txt (este arquivo)`,
    ``,
    `Observações:`,
    `- Não altere os arquivos antes da importação.`,
    `- Preserve o padrão de nomes das mídias geradas na execução.`,
    `- Utilize o módulo de Upload Unificado para ingestão posterior sem compressão.`,
    ``,
    `Equipe SmartLine™`
  ].join("\n");

  zip.addBuffer(Buffer.from(readme, "utf8"), "README.txt");
  zip.addBuffer(Buffer.from(JSON.stringify(mission, null, 2), "utf8"), "mission.json");

  switch (formato) {
    case "DJI":
      zip.addBuffer(Buffer.from(buildPlanJson(mission), "utf8"), "mission.dji.json");
      break;
    case "Autel":
      zip.addBuffer(Buffer.from(buildPlanJson(mission), "utf8"), "mission.autel.json");
      break;
    case "Ardupilot":
      zip.addBuffer(Buffer.from(buildArdupilotPlan(mission), "utf8"), "mission.ardupilot.plan");
      break;
    case "KML":
      zip.addBuffer(Buffer.from(buildKml(mission), "utf8"), "mission.kml");
      break;
    case "CSV":
      zip.addBuffer(Buffer.from(buildCsv(mission), "utf8"), "mission.csv");
      break;
    case "JSON":
    default:
      zip.addBuffer(Buffer.from(buildPlanJson(mission), "utf8"), "mission.export.json");
      break;
  }

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    zip.outputStream.pipe(output);
    zip.outputStream.on("error", reject);
    output.on("error", reject);
    output.on("close", resolve);
    zip.end();
  });

  return zipPath;
};

const listMissions = () => {
  ensureBaseDir();
  return readdirSync(BASE_DIR)
    .filter((name) => existsSync(join(BASE_DIR, name, "mission.json")))
    .map((name) => loadMission(name))
    .filter((mission): mission is MissionRecord => Boolean(mission));
};

export const missoesRoutes = new Hono();

missoesRoutes.post("/tipos", (c) => c.json({ tipos: missionTypes }));

missoesRoutes.get("/", (c) => {
  const lista = listMissions();
  return c.json({ items: lista });
});

missoesRoutes.post("/criar", async (c) => {
  const payload = (await c.req.json().catch(() => null)) as CreateMissionPayload | null;
  if (!payload || !payload.nome || !payload.tipo) {
    return c.json({ error: "Informe nome e tipo da missão." }, 400);
  }
  try {
    const mission = normaliseMissionPayload(payload);
    saveMission(mission);
    return c.json(mission, 201);
  } catch (error: any) {
    return c.json({ error: error?.message ?? "Não foi possível criar a missão." }, 400);
  }
});

missoesRoutes.get("/:id", (c) => {
  const mission = loadMission(c.req.param("id"));
  if (!mission) {
    return c.json({ error: "Missão não encontrada." }, 404);
  }
  return c.json(mission);
});

missoesRoutes.post("/:id/export", async (c) => {
  const id = c.req.param("id");
  const mission = loadMission(id);
  if (!mission) {
    return c.json({ error: "Missão não encontrada." }, 404);
  }
  const payload = (await c.req.json().catch(() => null)) as ExportMissionPayload | null;
  if (!payload?.formato) {
    return c.json({ error: "Informe o formato desejado." }, 400);
  }

  try {
    const zipFile = await createMissionZip(mission, payload.formato);
    const downloadUrl = `/missoes/${mission.id}/download`;

    mission.exports.push({
      formato: payload.formato,
      arquivo: zipFile.replace(`${process.cwd()}/`, ""),
      geradoEm: new Date().toISOString(),
      email: payload.email
    });
    mission.atualizadoEm = new Date().toISOString();
    saveMission(mission);

    if (payload.email && hasSmtpConfig()) {
      await sendMissionEmail(payload.email, mission, downloadUrl);
    }

    return c.json({
      ok: true,
      downloadUrl,
      emailEnviado: Boolean(payload.email && hasSmtpConfig())
    });
  } catch (error: any) {
    console.error("[missoes] falha ao exportar missão", error);
    return c.json({ error: "Não foi possível gerar o pacote da missão." }, 500);
  }
});

missoesRoutes.get("/:id/download", (c) => {
  const id = c.req.param("id");
  const dir = missionDir(id);
  const file = join(dir, "exports", "mission-package.zip");
  if (!existsSync(file)) {
    return c.json({ error: "Pacote não encontrado. Gere uma exportação primeiro." }, 404);
  }
  return new Response(createReadStream(file) as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="mission-package-${id}.zip"`
    }
  });
});
