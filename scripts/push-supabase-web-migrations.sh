#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI não encontrado no PATH."
  exit 1
fi

# Carrega variáveis dos envs mais comuns antes de validar a senha do banco.
load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.local"
load_env_file "$WEB_DIR/.env"
load_env_file "$WEB_DIR/.env.local"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "SUPABASE_DB_PASSWORD não definido. Coloque a variável em .env/.env.local ou exporte no shell antes de rodar este script."
  exit 1
fi

cd "$WEB_DIR"

echo "Aplicando migrations do apps/web no projeto Supabase linkado..."
supabase db push

echo
echo "Status das migrations remotas:"
supabase migration list
