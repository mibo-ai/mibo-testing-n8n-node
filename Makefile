.PHONY: help install build dev dev-docker lint clean

help:
	@echo "Mibo Testing n8n Node"
	@echo ""
	@echo "Development:"
	@echo "  make install     - Install dependencies"
	@echo "  make dev         - Local dev (requires: pnpm add -g n8n)"
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
	@echo "  make link        - Build and pnpm link for local n8n"

install:
	pnpm install

build:
	pnpm run build

dev:
	pnpm run dev

dev-docker:
	pnpm run dev:docker

lint:
	pnpm run lint

lint-fix:
	pnpm run lint:fix

docker-build:
	docker build -t n8n-mibo-testing:latest .

clean:
	rm -rf dist node_modules .last_build

link:
	pnpm run build && pnpm link
	@echo ""
	@echo "Now run: cd ~/.n8n && pnpm link n8n-nodes-mibo-testing"
