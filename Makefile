COMPOSE = docker compose -f docker/docker-compose.yml

.PHONY: dev test test/cache build clean

# Run test watcher
dev:
	$(COMPOSE) up dev

# Run test suite (fresh build)
test:
	$(COMPOSE) up --build test

# Run test suite (cached)
test/cache:
	$(COMPOSE) up test

# Build registry index
build:
	$(COMPOSE) up --build build

# Tear down containers and remove volumes
clean:
	$(COMPOSE) down -v --remove-orphans
