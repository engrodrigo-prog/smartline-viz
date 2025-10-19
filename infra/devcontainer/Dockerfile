FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    pdal \
    libpdal-dev \
    exiftool \
    ffmpeg \
    python3-pip \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

