import type maplibregl from "maplibre-gl";

export const hasMapStyle = (map: maplibregl.Map | null | undefined) => {
  if (!map?.getStyle) return false;
  try {
    return Boolean(map.getStyle());
  } catch {
    return false;
  }
};

export const isMapStyleReady = (map: maplibregl.Map | null | undefined) => {
  if (!hasMapStyle(map)) return false;
  try {
    return Boolean(map?.isStyleLoaded());
  } catch {
    return false;
  }
};

export const runWhenMapStyleReady = (
  map: maplibregl.Map | null | undefined,
  callback: () => void,
) => {
  if (!map) return () => {};
  if (isMapStyleReady(map)) {
    callback();
    return () => {};
  }

  let active = true;
  const handleReady = () => {
    if (!active || !isMapStyleReady(map)) return;
    callback();
  };

  map.once("style.load", handleReady);

  return () => {
    active = false;
    try {
      map.off("style.load", handleReady);
    } catch {
      // ignore
    }
  };
};
