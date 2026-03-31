# /help-ops

## Ops Komutlari
- `npm run ops:backup`
- `npm run ops:restore-test`
- `npm run ops:health-report`

## Ne Yapar
- `ops:backup`: kritik konfigurasyon ve secili repo dosyalarini zip checkpoint olarak alir.
- `ops:restore-test`: son checkpoint icin dry-run restore testi yapar.
- `ops:health-report`: local/test/prod health endpoint + backup tazeligi raporu uretir.

## Varsayilan Cikti
- Checkpoint: `output/shared/checkpoints/`
- Health report: `output/results/ops-health-latest.json`
