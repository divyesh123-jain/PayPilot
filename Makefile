.PHONY: test build run docker-build docker-run

test:
	cd backend && npm test
	cd frontend && npm run typecheck

build:
	cd backend && npm run build
	cd frontend && npm run build

run:
	docker compose up --build

docker-build:
	docker build --target api -t paypilot-api .
	docker build --target web -t paypilot-web .

docker-run:
	docker compose up --build
