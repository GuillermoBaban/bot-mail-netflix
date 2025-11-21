# Bot Mail Netflix - Docker

Bot automático para confirmar Netflix Household desde correos de Netflix.

## Requisitos

- Docker y Docker Compose instalados
- Archivo `.env` con las credenciales de tu correo

## Configuración

1. Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env
```

2. Edita `.env` con tus datos:

```
IMAP_USER=tu-email@gmail.com
IMAP_PASS=tu-contraseña-app-gmail
```

**Nota**: Para Gmail, necesitas generar una "Contraseña de aplicación" en tu cuenta de Google.

## Uso

### Construir y ejecutar:

```bash
docker-compose up -d --build
```

### Ver logs:

```bash
docker-compose logs -f
```

### Detener el bot:

```bash
docker-compose down
```

### Reiniciar el bot:

```bash
docker-compose restart
```

## Funcionamiento

El bot se ejecuta cada **10 segundos** automáticamente dentro del contenedor, revisando si hay nuevos correos de Netflix para confirmar el Household.
