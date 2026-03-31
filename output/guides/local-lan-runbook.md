# Local ve LAN Calistirma Runbook

## Hedef

- Local makinede calissin
- Ayni agdan 192.168.1.186 uzerinden erisilsin
- Port 9200 ustu olsun

## Secilen Ayar

- HOST=0.0.0.0
- PUBLIC_HOST=192.168.1.186
- PORT=9201
- PORT_CANDIDATES=9201,9202,9203

## Node ile Calistirma

PowerShell:
$env:TARGET_REPOSITORY="drizzle-pg"
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/apiflow_monitor"
$env:PROBE_MODE="mock"
$env:HOST="0.0.0.0"
$env:PUBLIC_HOST="192.168.1.186"
$env:PORT="9201"
$env:PORT_CANDIDATES="9201,9202,9203"
npm start

## Docker Compose ile Calistirma

- Komut: docker compose up -d
- Dosya: [docker-compose.yml](../../docker-compose.yml)

## Erisim URL

- Local: <http://127.0.0.1:9201>
- LAN: <http://192.168.1.186:9201>

## Sorun Giderme

- Windows Firewall icin 9201 inbound rule acik olmali.
- Port cakisiyorsa PORT degerini 9202 veya 9203 yap.
- Ag cihazindan ping ve tarayici testleri yap.
