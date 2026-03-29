# APIFlow Monitor MVP

Bu proje, bagladigin API endpoint'lerini kartlar halinde izleyen hizli bir dashboard MVP'sidir.

## Calistirma

```powershell
cd projects/apiflow-monitor-mvp
npm install
npm start
```

Dashboard:

- <http://127.0.0.1:8095>

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

## Not

CORS ve ag erisimi sorunlarini azaltmak icin UI dogrudan endpoint'e gitmez. Tüm istekler Node proxy endpoint'i `/api/probe` uzerinden cikar.
