# APIFlow Monitor MVP

Bu proje, bagladigin API endpoint'lerini kartlar halinde izleyen hizli bir dashboard MVP'sidir.

## Calistirma

```powershell
cd projects/apiflow-monitor-mvp
npm install
npm start
```

Opsiyonel ortam degiskenleri:

```powershell
# Varsayilan: repository=drizzle, probe=mock
$env:PROBE_MODE="mock"          # mock | live
$env:TARGET_REPOSITORY="drizzle"   # drizzle | drizzle-pg | postgres | mock | file
$env:DRIZZLE_DB_FILE="./output/shared/apiflow.db"
$env:HOST="0.0.0.0"
# Opsiyonel: vermesen de otomatik LAN IP algilanir
$env:PUBLIC_HOST="192.168.1.187"
$env:PORT="9201"
$env:PORT_CANDIDATES="9201,9202,9203"
npm start
```

PostgreSQL icin:
## Development

### Local (nodemon)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server with live reload:
   ```bash
   npm run dev
   ```
npm start
### Docker Compose (dev/test/prod)
1. Build and run containers:
   ```bash
   # Development (live reload)
   docker-compose up --build
   # veya NODE_ENV=development ile
   NODE_ENV=development docker-compose up --build

   # Test/Prod (container, artifact)
   NODE_ENV=production docker-compose up --build
   # veya .env dosyası ile ortamı belirleyin
   ```
2. Geliştirme ortamında (NODE_ENV=development) app servisi otomatik olarak `npx nodemon server.js` ile canlı reload çalıştırır. Test/prod ortamında ise `npm start` ile production modunda başlar.

3. Uygulama http://localhost:9201 adresinde çalışır.
```

Dashboard:

- <http://127.0.0.1:9201>
- <http://192.168.1.187:9201>

## Local + LAN Docker Compose

Bu proje local PostgreSQL + uygulama icin docker-compose ile calisabilir:

1. docker compose up -d
2. Tarayici:
   - <http://127.0.0.1:9201>
   - <http://192.168.1.187:9201>

Dosya: [docker-compose.yml](docker-compose.yml)

## GitHub Pages (Build + Deploy Tek Akis)

Bu repoda otomatik Pages workflow eklendi: [.github/workflows/pages.yml](.github/workflows/pages.yml)

Akis:

- `main` branch'e push
- GitHub Actions static bundle olusturur
- GitHub Pages'e deploy eder

GitHub tarafinda bir kez su ayari ac:

1. Repo `Settings`
2. `Pages`
3. `Source = GitHub Actions`

Not:

- Pages static hosting oldugu icin sadece UI yayinlar.
- Node API endpointleri (`/api/*`) Pages'te calismaz.
- Canli probe icin backend'i ayrica (VM, App Service, Container Apps vb.) yayinlayip UI'yi o API'ye baglamak gerekir.

## GitHub Actions: CI + Deploy

### 1) CI (local smoke test)

Workflow: [.github/workflows/ci.yml](.github/workflows/ci.yml)

- Push/PR ile calisir
- `npm ci` + app start
- `/healthz` ve `/api/targets` smoke check

### 2) Server Deploy (SSH + PM2)

Workflow: [.github/workflows/deploy-server.yml](.github/workflows/deploy-server.yml)

Manual `workflow_dispatch` ile calisir.

Gerekli GitHub Secrets:

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`
- `SERVER_PORT` (opsiyonel, default 22)
- `SERVER_APP_PATH` (sunucuda proje dizini)

Not:

- Sunucuda `pm2` kurulu olmali.
- Workflow kodu kopyalar, `npm ci --omit=dev` yapar, PM2 ile restart eder.

### 3) Azure Web App Deploy

Workflow: [.github/workflows/deploy-azure-webapp.yml](.github/workflows/deploy-azure-webapp.yml)

Manual `workflow_dispatch` ile calisir.

Gerekli GitHub Secrets:

- `AZURE_CREDENTIALS` (service principal JSON)
- `AZURE_WEBAPP_NAME`

## Azure DevOps Pipeline (Opsiyonel)

Repo kokunde ornek Azure DevOps pipeline dosyasi eklendi:

- [azure-pipelines.yml](azure-pipelines.yml)

Bu dosya validate + smoke adimlariyla baslar, deploy adimi placeholder olarak gelir.
Kendi ortamina gore SSH/Container/WebApp/AKS komutlarini buraya ekleyebilirsin.

## Tek Buton Otomatik Deploy (Güncel)

Branch'e göre otomatik hedef:
- dev branch: dev server (SSH)
- test branch: test server (SSH)
- prod branch: prod server (SSH) (isteğe bağlı Azure Web App/Container)
- main/master branch: prod server (SSH)
- Manuel override ile hedef seçilebilir.

Workflow: [.github/workflows/oneclick-deploy.yml](.github/workflows/oneclick-deploy.yml)

Kullanım:
1. Kodunu ilgili branch’e pushla (ör: dev)
2. GitHub Actions > One-Click Deploy workflow’unu başlat
3. (İsteğe bağlı) Hedef seç (auto, dev-server, test-server, prod-server, azure-webapp)
4. Deploy sonrası otomatik smoke test yapılır
5. Hata olursa rollback adımı tetiklenir (manuel placeholder)

## Local Kontrol/Test

Yerel kontrol endpoint'i:

- `GET /healthz`

Ornek:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9201/healthz | Select-Object -ExpandProperty StatusCode
```

## Hazir API Ornekleri (Kart Import)

UI'da `Targets Ice Aktar` ile bu dosyayi import edebilirsin:

- Stabil ve duzenli JSON cevaplari (onerilen): [inputs/sample-targets.json](inputs/sample-targets.json)
- Alarm testi (429/503/timeout): [inputs/sample-targets-alert-test.json](inputs/sample-targets-alert-test.json)

Not: Saat API cikarildi, kartlarda daha stabil davranan endpointler secildi.

## Ozellikler

- API endpointlerini kart bazli gosterim
- Durum (up/down), HTTP status, latency, son guncelleme
- Her API icin response preview (json/text)
- Son olaylar icin log paneli
- UI uzerinden yeni API hedefi ekleme
- localStorage ile hedefleri kalici saklama
- Kart bazli yonetim: duzenle, sil, pause/resume
- Arama + durum filtresi (all/up/down)
- Uygulama ici hata banner'i (esik degeri ve mute)
- Probe dayanikliligi: retry, signal (UP/WARN/DOWN/TIMEOUT), attempts
- Targets import/export (JSON)
- DI uyumlu provider yapisi (probe service + target repository)
- Mock data ile hizli gelistirme, canli moda gecis icin sadece env degiskeni
- Drizzle ORM ile SQLite tabanli repository (db-agnostic provider mimarisi)
- Drizzle ORM ile PostgreSQL repository secenegi (drizzle-pg)

## Not

CORS ve ag erisimi sorunlarini azaltmak icin UI dogrudan endpoint'e gitmez. Tüm istekler Node proxy endpoint'i `/api/probe` uzerinden cikar.

## Mimari (DI)

- Probe servisi: [src/providers/probeService.js](src/providers/probeService.js)
- Target repository: [src/providers/targetRepository.js](src/providers/targetRepository.js)
- DI container: [src/container.js](src/container.js)

Bu yapida yeni bir DB eklemek icin target repository sinifina yeni provider yazman yeterli.
Ornek: PostgresTargetRepository, MongoTargetRepository, RedisTargetRepository.

## Drizzle Kullanim Akisi

1. Kurulum (yapildi): `drizzle-orm`, `better-sqlite3`, `drizzle-kit`
2. Drizzle config: [drizzle.config.js](drizzle.config.js)
3. Schema: [src/db/schema.js](src/db/schema.js)
4. Migration dosyalari (opsiyonel):

```powershell
npm run db:generate
npm run db:push
```

PostgreSQL migration/config:

```powershell
npm run db:generate:pg
npm run db:push:pg
```

## Girdi/Cikti Kayitlari

Sistem artik calisma verisini dosyaya JSONL formatinda yazar:

- Girdiler: [inputs/probe-inputs.jsonl](inputs/probe-inputs.jsonl)
- Ciktilar: [output/results/probe-outputs.jsonl](output/results/probe-outputs.jsonl)
- Target olaylari: [output/shared/target-events.jsonl](output/shared/target-events.jsonl)

Bu akista hem test/QA izi tutulur hem de ileride analytics pipeline icin ham veri korunur.
test: auto deploy workflow test
test: workflow trigger
