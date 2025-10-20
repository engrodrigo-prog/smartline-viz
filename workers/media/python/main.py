#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Worker responsável por processar lotes de mídia:
 - Extrai EXIF de fotos georreferenciadas.
 - Lê trilhas SRT para sincronizar frames com coordenadas.
 - Gera quadros (sem compressão extra) e thumbnails otimizadas.
 - Produz GeoJSON com metadados preservando temaPrincipal/temas.
"""
from __future__ import annotations

import json
import math
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import cv2
import exifread
import numpy as np
from pyproj import Geod
from shapely.geometry import Point, mapping

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MEDIA_ROOT = os.path.join(ROOT, "apps", "api", ".data", "media")
MEDIA_RAW = os.path.join(MEDIA_ROOT, "raw")
MEDIA_DERIVED = os.path.join(MEDIA_ROOT, "derived")
MEDIA_META = os.path.join(MEDIA_ROOT, "meta")
FRAMES_BASE = os.path.join(MEDIA_DERIVED, "frames")
FRAMES_STORE = os.path.join(FRAMES_BASE, "store")

WORKER_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INBOX = os.path.join(WORKER_ROOT, "inbox")
OUTBOX = os.path.join(WORKER_ROOT, "outbox")

for path in (MEDIA_ROOT, MEDIA_RAW, MEDIA_DERIVED, MEDIA_META, FRAMES_BASE, FRAMES_STORE, INBOX, OUTBOX):
    os.makedirs(path, exist_ok=True)

geod = Geod(ellps="WGS84")


def log(message: str) -> None:
    print(f"[worker.media] {message}", flush=True)


def read_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: str, payload: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def to_decimal(values, ref) -> Optional[float]:
    if not values or not ref:
        return None
    try:
        nums = [float(v.num) / float(v.den) for v in values]  # type: ignore[attr-defined]
        deg, minutes, seconds = nums
        sign = -1 if str(ref).upper() in {"S", "W"} else 1
        return sign * (deg + minutes / 60.0 + seconds / 3600.0)
    except Exception:
        return None


def parse_exif(path: str) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    try:
        with open(path, "rb") as handle:
            tags = exifread.process_file(handle, details=False)
        lat = to_decimal(tags.get("GPS GPSLatitude"), tags.get("GPS GPSLatitudeRef"))
        lon = to_decimal(tags.get("GPS GPSLongitude"), tags.get("GPS GPSLongitudeRef"))
        alt_tag = tags.get("GPS GPSAltitude")
        alt = float(alt_tag.values[0].num) / float(alt_tag.values[0].den) if alt_tag else None  # type: ignore[attr-defined]
        captured = tags.get("EXIF DateTimeOriginal") or tags.get("Image DateTime")
        if captured:
            try:
                data["captured_at"] = datetime.strptime(str(captured), "%Y:%m:%d %H:%M:%S").replace(tzinfo=timezone.utc).isoformat()
            except ValueError:
                data["captured_at"] = str(captured)
        if lat is not None and lon is not None:
            data.update({"lat": lat, "lon": lon})
        if alt is not None:
            data["alt"] = alt
    except Exception as exc:
        log(f"falha ao extrair EXIF de {path}: {exc}")
    return data


@dataclass
class TrackPoint:
    start_ms: int
    end_ms: int
    lat: float
    lon: float
    alt: Optional[float]


TIME_PATTERN = re.compile(r"(\d{2}):(\d{2}):(\d{2}),(\d{3})")
POS_PATTERN = re.compile(r"(-?\d+(?:\.\d+)?)")


def parse_srt(path: str) -> List[TrackPoint]:
    if not os.path.isfile(path):
        return []
    blocks: List[List[str]] = []
    current: List[str] = []
    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        for line in handle:
            stripped = line.strip()
            if stripped:
                current.append(stripped)
            else:
                if current:
                    blocks.append(current)
                    current = []
        if current:
            blocks.append(current)

    tracks: List[TrackPoint] = []
    for block in blocks:
        if len(block) < 2:
            continue
        time_line = block[1]
        times = TIME_PATTERN.findall(time_line)
        if len(times) < 2:
            continue
        start_h, start_m, start_s, start_ms = times[0]
        end_h, end_m, end_s, end_ms = times[1]
        start_total = (int(start_h) * 3600 + int(start_m) * 60 + int(start_s)) * 1000 + int(start_ms)
        end_total = (int(end_h) * 3600 + int(end_m) * 60 + int(end_s)) * 1000 + int(end_ms)

        lat = lon = alt = None
        for text in block[2:]:
            coords = POS_PATTERN.findall(text)
            if len(coords) >= 2:
                lat = float(coords[0])
                lon = float(coords[1])
                if len(coords) >= 3:
                    alt = float(coords[2])
                break
        if lat is not None and lon is not None:
            tracks.append(TrackPoint(start_ms=start_total, end_ms=end_total, lat=lat, lon=lon, alt=alt))
    return tracks


def nearest_track(tracks: List[TrackPoint], timestamp_ms: int) -> Optional[TrackPoint]:
    if not tracks:
        return None
    return min(tracks, key=lambda t: min(abs(timestamp_ms - t.start_ms), abs(timestamp_ms - t.end_ms)))


def ensure_dir(path: str) -> str:
    os.makedirs(path, exist_ok=True)
    return path


def save_frame(image: np.ndarray, path: str) -> None:
    ensure_dir(os.path.dirname(path))
    cv2.imwrite(path, image, [int(cv2.IMWRITE_JPEG_QUALITY), 92])


def extract_video_frames(
    video_path: str,
    output_dir: str,
    interval_seconds: int,
    tracks: List[TrackPoint]
) -> List[Dict[str, Any]]:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise RuntimeError(f"não foi possível abrir vídeo {video_path}")
    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    if math.isclose(fps, 0.0):
        fps = 30.0
    step = max(1, int(round(interval_seconds * fps)))
    seq = 0
    index = 0
    frames: List[Dict[str, Any]] = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if index % step == 0:
            timestamp_ms = int((index / fps) * 1000)
            seq += 1
            filename = f"frame_{seq:06d}.jpg"
            full_path = os.path.join(output_dir, filename)
            save_frame(frame, full_path)
            track = nearest_track(tracks, timestamp_ms)
            intensity = float(np.mean(frame))
            frames.append(
                {
                    "filename": filename,
                    "path": full_path,
                    "timestamp_ms": timestamp_ms,
                    "lat": track.lat if track else None,
                    "lon": track.lon if track else None,
                    "alt": track.alt if track else None,
                    "intensity": intensity,
                    "sequence": seq
                }
            )
        index += 1
    capture.release()
    return frames


def build_feature(lon: float, lat: float, properties: Dict[str, Any]) -> Dict[str, Any]:
    point = Point(lon, lat)
    return {
        "type": "Feature",
        "geometry": mapping(point),
        "properties": properties
    }


def accumulate_distance(points: List[Tuple[float, float]]) -> float:
    if len(points) < 2:
        return 0.0
    lons, lats = zip(*points)
    return float(abs(geod.line_length(lons, lats)))


def update_record(record_path: str, updater) -> Dict[str, Any]:
    record = read_json(record_path)
    updater(record)
    write_json(record_path, record)
    return record


def process_job(job_path: str) -> None:
    job = read_json(job_path)
    job_id: str = job["id"]
    media_id: str = job["mediaId"]
    frame_interval: int = int(job.get("frameInterval", job.get("frame_interval_s", 1)))
    tema_principal: str = job.get("temaPrincipal", "")
    temas: List[str] = job.get("temas", [])
    raw_dir = os.path.join(MEDIA_RAW, media_id)
    if not os.path.isdir(raw_dir):
        raise RuntimeError(f"diretório de origem não encontrado: {raw_dir}")

    frames_dir = ensure_dir(os.path.join(FRAMES_STORE, media_id))
    geojson_dir = ensure_dir(os.path.join(FRAMES_BASE, media_id))
    geojson_path = os.path.join(geojson_dir, "frames.geojson")

    record_path = os.path.join(MEDIA_META, f"{media_id}.json")
    features: List[Dict[str, Any]] = []
    distance_pairs: List[Tuple[float, float]] = []

    record = read_json(record_path)
    record["status"] = "processing"
    record["processadoEm"] = datetime.utcnow().isoformat() + "Z"
    write_json(record_path, record)

    srt_cache: Dict[str, List[TrackPoint]] = {}
    for asset in job.get("assets", []):
        if asset.get("tipo") == "srt":
            base = os.path.splitext(asset.get("originalName", ""))[0]
            srt_cache[base] = parse_srt(os.path.join(raw_dir, asset["filename"]))

    asset_index = {asset["id"]: asset for asset in record.get("assets", [])}

    for asset in job.get("assets", []):
        asset_id = asset["id"]
        stored_file = os.path.join(raw_dir, asset["filename"])
        if not os.path.isfile(stored_file):
            log(f"arquivo não encontrado: {stored_file}")
            continue
        asset_temporal = asset_index.get(asset_id)
        propriedades_base = {
            "mediaId": media_id,
            "assetId": asset_id,
            "temaPrincipal": asset.get("temaPrincipal", tema_principal),
            "temas": asset.get("temas", temas),
            "tipo": asset.get("tipo"),
            "filename": asset.get("filename"),
            "originalName": asset.get("originalName")
        }

        if asset.get("tipo") == "foto":
            exif_data = parse_exif(stored_file)
            if asset_temporal is not None:
                meta = asset_temporal.get("meta", {})
                meta.update({"exif": exif_data})
                asset_temporal["meta"] = meta
            if "lat" in exif_data and "lon" in exif_data:
                feature = build_feature(
                    exif_data["lon"],
                    exif_data["lat"],
                    {**propriedades_base, **{"captured_at": exif_data.get("captured_at"), "kind": "foto"}}
                )
                features.append(feature)
                distance_pairs.append((exif_data["lon"], exif_data["lat"]))

        elif asset.get("tipo") == "video":
            base_name = os.path.splitext(asset.get("originalName", ""))[0]
            tracks = srt_cache.get(base_name, [])
            video_frames = extract_video_frames(
                stored_file,
                ensure_dir(os.path.join(frames_dir, base_name or asset_id)),
                frame_interval,
                tracks
            )
            if asset_temporal is not None:
                asset_temporal.setdefault("meta", {})
                asset_temporal["meta"].update(
                    {
                        "framesExtraidos": len(video_frames),
                        "frameInterval": frame_interval,
                        "tracks": len(tracks)
                    }
                )

            for frame in video_frames:
                props = {
                    **propriedades_base,
                    "kind": "frame",
                    "frameSeq": frame["sequence"],
                    "timestamp_ms": frame["timestamp_ms"],
                    "intensity": frame.get("intensity"),
                    "path": os.path.relpath(frame["path"], MEDIA_ROOT)
                }
                if frame["lat"] is not None and frame["lon"] is not None:
                    features.append(build_feature(frame["lon"], frame["lat"], props))
                    distance_pairs.append((frame["lon"], frame["lat"]))

    distance_total = accumulate_distance(distance_pairs)

    fc = {"type": "FeatureCollection", "features": features}
    write_json(geojson_path, fc)
    write_json(os.path.join(OUTBOX, f"{job_id}.geojson"), fc)

    def finalize(rec: Dict[str, Any]) -> None:
        rec["status"] = "done"
        rec["framesResumo"] = {
            "quantidade": len(features),
            "distancia_m": distance_total
        }
        rec["processadoEm"] = datetime.utcnow().isoformat() + "Z"

    record["status"] = "done"
    record["framesResumo"] = {
        "quantidade": len(features),
        "distancia_m": distance_total
    }
    record["processadoEm"] = datetime.utcnow().isoformat() + "Z"
    derived = record.get("derived", {})
    derived["frames"] = {
        "geojson": os.path.relpath(geojson_path, MEDIA_ROOT),
        "baseDir": os.path.relpath(os.path.join(FRAMES_STORE, media_id), MEDIA_ROOT)
    }
    record["derived"] = derived
    write_json(record_path, record)

    write_json(
        os.path.join(OUTBOX, f"{job_id}.status.json"),
        {"state": "done", "features": len(features), "mediaId": media_id}
    )

    log(f"job {job_id} concluído - {len(features)} features (distância {distance_total:.2f} m)")


def loop() -> None:
    log("iniciando processamento de mídia… (Ctrl+C para sair)")
    while True:
        jobs = sorted(f for f in os.listdir(INBOX) if f.endswith(".json"))
        if jobs:
            job_filename = jobs[0]
            job_path = os.path.join(INBOX, job_filename)
            try:
                log(f"processando {job_filename}")
                process_job(job_path)
                os.remove(job_path)
            except Exception as exc:
                log(f"erro ao processar {job_filename}: {exc}")
                write_json(
                    os.path.join(OUTBOX, job_filename.replace(".json", ".status.json")),
                    {"state": "error", "message": str(exc)}
                )
        time.sleep(1)


if __name__ == "__main__":
    loop()
