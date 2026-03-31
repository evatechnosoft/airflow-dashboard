# Test to Main Merge Checklist

Bu checklist, `test` branch'inden `main` branch'ine merge etmeden once minimum kalite kapisini saglamak icindir.

## 1) Branch ve Senkron Kontrolu

- [ ] `test` branch guncel (`git pull origin test`)
- [ ] `main` branch ile farklar gozden gecirildi (`git log --oneline main..test`)
- [ ] Acik conflict riski olan dosyalar not edildi

## 2) Uygulama Saglik Kontrolu

- [ ] `npm install` sorunsuz
- [ ] `npm run health:all` basarili
- [ ] `npm run ops:backup` basarili
- [ ] `npm run ops:health-report` basarili

## 3) Workflow/CI Kontrolu

- [ ] GitHub Actions workflow dosyalarinda editor error yok
- [ ] Son push icin pre-push test hooklari basarili
- [ ] Deployment workflowlarinda zorunlu secret adlari dokumante edildi

## 4) Dokumantasyon Kontrolu

- [ ] Yardim komut dosyalari guncel (`docs/help/*`)
- [ ] `handoff.md` bugunku durumla guncel
- [ ] Yeni script/komutlar README veya ilgili guide'da kayitli

## 5) Guvenlik ve Temizlik

- [ ] Secret/credential benzeri dosyalar stage edilmedi
- [ ] `.gitignore` kritik desenleri kapsiyor
- [ ] Gereksiz gecici ciktilar commit'e dahil degil

## 6) Merge Karari

- [ ] PR aciklamasinda kapsam ve risk yazildi
- [ ] Geri donus (rollback) adimi tanimli
- [ ] Merge onayi verildi

---

## Merge Komutlari (Ornek)

```bash
git checkout test
git pull origin test
git checkout main
git pull origin main
git merge --no-ff test
git push origin main
```

Not: Ekip surecine gore PR merge tercih edilmesi onerilir.
