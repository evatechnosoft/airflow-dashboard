# Drizzle Kullanimi ve Genisletme Rehberi

## Amac
Bu projede Drizzle, target repository katmanini DB'den bagimsiz sekilde yonetmek icin kullanilir.
UI tarafi degismeden repository provider degistirilebilir.

## Mevcut Provider Secenekleri
- drizzle: Varsayilan. SQLite + Drizzle ORM.
- drizzle-pg / postgres: PostgreSQL + Drizzle ORM.
- mock: Bellek icinde test verisi.
- file: targets.json dosyasina yazma/okuma.

## Ortam Degiskenleri
```powershell
$env:TARGET_REPOSITORY="drizzle"
$env:PROBE_MODE="mock"
$env:DRIZZLE_DB_FILE="./output/shared/apiflow.db"
npm start
```

PostgreSQL:
```powershell
$env:TARGET_REPOSITORY="drizzle-pg"
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/apiflow_monitor"
$env:PROBE_MODE="mock"
npm start
```

## Drizzle Dosyalari
- Config: [drizzle.config.js](../../drizzle.config.js)
- PG Config: [drizzle.config.pg.js](../../drizzle.config.pg.js)
- Schema: [src/db/schema.js](../../src/db/schema.js)
- PG Schema: [src/db/schema.pg.js](../../src/db/schema.pg.js)
- Provider: [src/providers/drizzleTargetRepository.js](../../src/providers/drizzleTargetRepository.js)
- PG Provider: [src/providers/drizzlePostgresTargetRepository.js](../../src/providers/drizzlePostgresTargetRepository.js)

## Migration Komutlari
```powershell
npm run db:generate
npm run db:push
npm run db:generate:pg
npm run db:push:pg
```

## Yeni DB'ye Gecis Plani
1. Yeni repository sinifi yaz:
   - Ornek: PostgresTargetRepository
   - Metotlar: list, create, update, remove
2. Factory'e ekle:
   - [src/providers/targetRepository.js](../../src/providers/targetRepository.js)
3. Env degiskeni ile aktif et:
   - TARGET_REPOSITORY=postgres

## Not
Bu yaklasim DI uyumludur. Ust katman (server ve UI) repository tipini bilmez.
