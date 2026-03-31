# Inputs / Outputs Kontrati

## Inputs
- [inputs/probe-inputs.jsonl](../../inputs/probe-inputs.jsonl)
- Format:
```json
{"at":"ISO_DATE","request":{"url":"...","method":"GET","timeoutMs":5000}}
```

## Outputs
- [output/results/probe-outputs.jsonl](../results/probe-outputs.jsonl)
- Format:
```json
{"at":"ISO_DATE","request":{"url":"..."},"response":{"ok":true,"status":200,"latencyMs":123}}
```

## Shared Events
- [output/shared/target-events.jsonl](../shared/target-events.jsonl)
- Event tipleri:
  - target.created
  - target.updated
  - target.deleted

## Neden Bu Yapi
- Test tekrar edilebilirligi
- QA / geriye donuk izlenebilirlik
- Gelecekte analitik pipeline baglantisi
