# /help-deploy

## Local DEV
- `docker-compose up -d`
- Health: `http://127.0.0.1:9201/healthz`

## Server PROD (dean)
- `ssh dean 'cd /DATA/projects/apiflow-monitor-prod && bash scripts/deploy-dean.sh test'`
- Health: `http://192.168.1.186:9309/healthz`

## Mode
- Varsayilan: `PROBE_MODE=live`
