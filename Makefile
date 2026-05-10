dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

dev-build:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

down:
	docker compose down

full-down-dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v

backup:
	bash scripts/backup.sh

restore:
	@if [ -z "$(FILE)" ]; then bash scripts/restore.sh; else bash scripts/restore.sh $(FILE); fi
