# 🚀 Docker Hub Deployment

## 🔐 Настройка секретов GitHub

Перед первым деплоем нужно добавить секреты в репозиторий:

1. Откройте репозиторий на GitHub
2. Перейди в **Settings** → **Secrets and variables** → **Actions**
3. Нажми **New repository secret** и добавь:

   **DOCKER_USERNAME**
   - Значение: `dzarlax`

   **DOCKER_PASSWORD**
   - Значение: Твой Docker Hub access token
   - Как получить:
     1. Перейди на https://hub.docker.com/settings/security
     2. Нажми "New Access Token"
     3. Описание: `GitHub Actions`
     4. Access permissions: `Read, Write, Delete`
     5. Сгенерируй и скопируй токен

## 📋 Как это работает

**Автоматическая сборка и публикация:**

| Событие | Теги образа | Push в Docker Hub |
|---------|------------|-------------------|
| Push в `main` | `latest`, `main` | ✅ Да |
| Тег `v1.2.3` | `v1.2.3`, `v1.2`, `latest` | ✅ Да |
| Pull Request | - | ❌ Нет (тест только) |

## 🏷️ Тегирование образов

- **`latest`** - последний коммит в `main`
- **`main`** - последний коммит в `main`
- **`v1.2.3`** - полная версия при релизе
- **`v1.2`** - major.minor версия при релизе

## 🐳 Использование

### После автоматической сборки:

```bash
# Запуск последней версии
docker run -d \
  --name wishlist \
  -p 3000:3000 \
  -v $(pwd)/wishlist.db:/app/wishlist.db \
  -e ADMIN_PASSWORD="your_password" \
  dzarlax/wishlist-app:latest

# Запуск конкретной версии
docker run -d \
  --name wishlist \
  -p 3000:3000 \
  -v $(pwd)/wishlist.db:/app/wishlist.db \
  -e ADMIN_PASSWORD="your_password" \
  dzarlax/wishlist-app:v1.0.0

# С docker-compose
docker-compose up -d
```

## 🔄 Создание релиза

Для публикации версии:

1. Создай Git тег:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. GitHub Action автоматически соберёт и опубликует:
   - `dzarlax/wishlist-app:v1.0.0`
   - `dzarlax/wishlist-app:v1.0`
   - `dzarlax/wishlist-app:latest`

## 📊 Статус сборок

Смотреть статус можно в репозитории GitHub:
- Вкладка **Actions**
- Каждый запуск показывает логи сборки
