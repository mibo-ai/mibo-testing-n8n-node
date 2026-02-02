.PHONY: help install build dev dev-docker lint clean

help:
	@echo "Mibo Testing n8n Node"
	@echo ""
	@echo "Development:"
	@echo "  make install     - Install dependencies"
	@echo "  make dev         - Local dev (requires: npm i -g n8n)"
	@echo "  make dev-docker  - Docker dev (auto hot-reload)"
	@echo ""
	@echo "Build:"
	@echo "  make build       - Build TypeScript"
	@echo "  make lint        - Run linter"
	@echo "  make lint-fix    - Run linter with auto-fix"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build - Build production image"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean       - Remove dist and node_modules"
	@echo "  make link        - Build and npm link for local n8n"

install:
	npm install

build:
	npm run build

dev:
	npm run dev

dev-docker:
	npm run dev:docker

lint:
	npm run lint

lint-fix:
	npm run lint:fix

docker-build:
	docker build -t n8n-mibo-testing:latest .

clean:
	rm -rf dist node_modules .last_build

link:
	npm run build && npm link
	@echo ""
	@echo "Now run: cd ~/.n8n && npm link n8n-nodes-mibo-testing"
