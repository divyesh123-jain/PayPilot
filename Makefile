.PHONY: test build run docker-build docker-run

test:
	cd backend && npm test

build:
	cd backend && npm run build

run:
	cd backend && npm start

docker-build:
	docker build -t paypilot-domain .

docker-run:
	docker run --rm paypilot-domain
