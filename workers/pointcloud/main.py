#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import math
import os
import random
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import laspy  # type: ignore
import numpy as np  # type: ignore
from pyproj import CRS, Transformer  # type: ignore
from shapely.geometry import LineString, Point, shape  # type: ignore
from shapely.ops import transform as shapely_transform  # type: ignore
from shapely.prepared import prep  # type: ignore
from tqdm import tqdm  # type: ignore

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "apps" / "api" / ".data" / "pointclouds"

CLASS_PALETTE: Dict[int, Dict[str, str]] = {
    1: {"name": "Unclassified", "color": "#9ca3af"},
    2: {"name": "Ground", "color": "#f97316"},
    3: {"name": "Low Vegetation", "color": "#84cc16"},
    4: {"name": "Medium Vegetation", "color": "#22c55e"},
    5: {"name": "High Vegetation", "color": "#166534"},
    6: {"name": "Building", "color": "#1d4ed8"},
    7: {"name": "Low Point/Noise", "color": "#facc15"},
    8: {"name": "Model Key-point", "color": "#f97316"},
    9: {"name": "Water", "color": "#0ea5e9"},
    17: {"name": "Bridge/Culvert", "color": "#f43f5e"},
}


def log(message: str) -> None:
    print(f"[pointcloud-worker] {message}", flush=True)


def safe_load_json(path: Path) -> Optional[dict]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:
        log(f"Falha ao ler {path}: {exc}")
        return None


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def find_las_file(base: Path) -> Optional[Path]:
    for ext in (".las", ".laz"):
        candidate = base / f"raw{ext}"
        if candidate.exists():
            return candidate
    return None


def prepare_transformers(header: laspy.LasHeader) -> Tuple[Optional[CRS], Optional[Transformer], Optional[Transformer]]:
    try:
        crs = header.parse_crs()
    except Exception:
        crs = None

    if not crs:
        return None, None, None

    try:
        to_wgs84 = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
        from_wgs84 = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
        return crs, to_wgs84, from_wgs84
    except Exception as exc:
        log(f"Não foi possível preparar transformações CRS: {exc}")
        return crs, None, None


def transform_bounds(transformer: Optional[Transformer], mins: Iterable[float], maxs: Iterable[float]) -> Optional[Dict[str, List[float]]]:
    if not transformer:
        return None
    try:
        minx, miny, minz = mins
        maxx, maxy, maxz = maxs
        lon_min, lat_min = transformer.transform(minx, miny)
        lon_max, lat_max = transformer.transform(maxx, maxy)
        return {
            "min": [float(lat_min), float(lon_min), float(minz)],
            "max": [float(lat_max), float(lon_max), float(maxz)],
        }
    except Exception as exc:
        log(f"Falha ao transformar limites para WGS84: {exc}")
        return None


def read_las_chunks(path: Path, chunk_size: int = 1_000_000):
    with laspy.open(path) as reader:
        for chunk in reader.chunk_iterator(chunk_size):
            yield chunk


def process_index_job(base_dir: Path, job: dict) -> None:
    las_path = Path(job.get("inputFile", ""))
    if not las_path.exists():
        raise FileNotFoundError(f"Arquivo LAS/LAZ não encontrado: {las_path}")

    with laspy.open(las_path) as reader:
        header = reader.header
        mins = list(header.mins)
        maxs = list(header.maxs)
        total_points = int(header.point_count)
        crs, to_wgs84, _ = prepare_transformers(header)

    counter: Counter[int] = Counter()
    for chunk in read_las_chunks(las_path):
        classes = np.asarray(chunk.classification, dtype=int)
        unique, counts = np.unique(classes, return_counts=True)
        for cls, cnt in zip(unique.tolist(), counts.tolist()):
            counter[int(cls)] += int(cnt)

    index_payload = {
        "id": job["id"],
        "pointsTotal": total_points,
        "bbox_native": {
            "min": [float(mins[0]), float(mins[1]), float(mins[2])],
            "max": [float(maxs[0]), float(maxs[1]), float(maxs[2])],
        },
        "bbox_wgs84": transform_bounds(to_wgs84, mins, maxs),
        "classes": {str(cls): int(count) for cls, count in sorted(counter.items())},
        "coordinate_system": crs.to_wkt() if crs else None,
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    save_json(base_dir / "index.json", index_payload)
    save_json(base_dir / "products" / "classes.json", {str(k): v for k, v in CLASS_PALETTE.items()})


def reservoir_add(reservoir: List[dict], capacity: int, total_seen: int, candidate: dict) -> None:
    if len(reservoir) < capacity:
        reservoir.append(candidate)
        return
    idx = random.randint(0, total_seen)
    if idx < capacity:
        reservoir[idx] = candidate


def interpolate_point(line: LineString, distance: float) -> Tuple[float, float]:
    target_distance = max(0.0, min(distance, line.length))
    point = line.interpolate(target_distance)
    return float(point.x), float(point.y)


def process_profile_job(base_dir: Path, job: dict) -> None:
    las_path = Path(job.get("inputFile", ""))
    if not las_path.exists():
        raise FileNotFoundError(f"Arquivo LAS/LAZ não encontrado: {las_path}")

    line_feature = job.get("line")
    if not line_feature:
        raise ValueError("Linha não informada no job.")

    line_geom = shape(line_feature.get("geometry"))
    if not isinstance(line_geom, LineString):
        raise ValueError("Geometria da linha deve ser LineString.")

    buffer_m = float(job.get("buffer_m") or 25)
    step_m = float(job.get("step_m") or 0.5)
    classes_filter = set(job.get("classes") or [])
    max_points_plan = int(job.get("max_points_per_plan") or 200_000)

    with laspy.open(las_path) as reader:
        header = reader.header
        crs, to_wgs84, from_wgs84 = prepare_transformers(header)

    if from_wgs84:
        try:
            transform_fn = lambda x, y: from_wgs84.transform(x, y)  # noqa: E731
            transformed_coords = [transform_fn(x, y) for x, y in list(line_geom.coords)]
            line_local = LineString(transformed_coords)
        except Exception as exc:
            log(f"Falha ao reprojetar linha para CRS do LAS: {exc}")
            line_local = LineString(list(line_geom.coords))
    else:
        line_local = LineString(list(line_geom.coords))

    if line_local.length == 0:
        raise ValueError("Linha com comprimento zero não é suportada.")

    buffer_geom = prep(line_local.buffer(buffer_m))
    total_selected = 0
    plan_features: List[dict] = []
    bins: Dict[int, Dict[int, Dict[str, float]]] = defaultdict(lambda: defaultdict(lambda: {"sum": 0.0, "count": 0}))

    for chunk in tqdm(read_las_chunks(las_path), desc="Filtrando pontos", unit="chunk"):
        xs = np.asarray(chunk.x)
        ys = np.asarray(chunk.y)
        zs = np.asarray(chunk.z)
        classes = np.asarray(chunk.classification, dtype=int)
        intensities = np.asarray(chunk.intensity) if hasattr(chunk, "intensity") else None

        for i in range(len(xs)):
            cls = int(classes[i])
            if classes_filter and cls not in classes_filter:
                continue

            pt = Point(float(xs[i]), float(ys[i]))
            if not buffer_geom.contains(pt):
                continue

            total_selected += 1
            s_dist = line_local.project(pt)
            bin_index = int(math.floor(s_dist / step_m)) if step_m > 0 else 0
            stats = bins[bin_index][cls]
            stats["sum"] += float(zs[i])
            stats["count"] += 1

            coord_x = float(xs[i])
            coord_y = float(ys[i])
            lon, lat = (
                to_wgs84.transform(coord_x, coord_y) if to_wgs84 else (coord_x, coord_y)
            )

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(lon), float(lat), float(zs[i])],
                },
                "properties": {
                    "cls": cls,
                    "z": float(zs[i]),
                    **({"intensity": float(intensities[i])} if intensities is not None else {}),
                },
            }
            reservoir_add(plan_features, max_points_plan, total_selected - 1, feature)

    plan_collection = {
        "type": "FeatureCollection",
        "features": plan_features,
    }

    series: List[dict] = []
    for bin_index in sorted(bins.keys()):
        s_m = bin_index * step_m
        x_local, y_local = interpolate_point(line_local, s_m)
        lon, lat = (
            to_wgs84.transform(x_local, y_local) if to_wgs84 else (x_local, y_local)
        )
        for cls, stats in sorted(bins[bin_index].items()):
            if stats["count"] == 0:
                continue
            avg_z = stats["sum"] / stats["count"]
            series.append(
                {
                    "s_m": round(float(s_m), 3),
                    "z_m": round(float(avg_z), 3),
                    "cls": int(cls),
                    "count": int(stats["count"]),
                    "x": float(lon),
                    "y": float(lat),
                }
            )

    profile_payload = {
        "id": job["id"],
        "buffer_m": buffer_m,
        "step_m": step_m,
        "series": series,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    save_json(base_dir / "products" / "plan_points.geojson", plan_collection)
    save_json(base_dir / "products" / "profile.json", profile_payload)


def process_job(job_file: Path) -> None:
    job = safe_load_json(job_file)
    if not job:
        return

    base_dir = job_file.parents[1]
    job_type = job.get("type")

    log(f"Processando job {job_type} para {job.get('id')}")
    try:
        if job_type == "index":
            process_index_job(base_dir, job)
        elif job_type == "profile":
            process_profile_job(base_dir, job)
        else:
            log(f"Tipo de job desconhecido: {job_type}")
            return
    except Exception as exc:
        error_payload = {
            "error": str(exc),
            "failedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "job": job,
        }
        save_json(base_dir / "products" / "last_error.json", error_payload)
        log(f"Job falhou: {exc}")
    else:
        job_file.unlink(missing_ok=True)
        log("Job finalizado com sucesso.")


def main() -> None:
    log("Iniciando worker de nuvens de pontos (Ctrl+C para sair)")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    while True:
        job_found = False
        for pointcloud_dir in DATA_DIR.iterdir():
            queue_dir = pointcloud_dir / "queue"
            if not queue_dir.exists():
                continue
            for job_file in sorted(queue_dir.glob("*.json")):
                job_found = True
                process_job(job_file)
        if not job_found:
            time.sleep(2)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Encerrando worker.")
