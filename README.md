# Proyecto AWS Local con Floci

Aplicacion web en Node.js y Express que emula servicios de Amazon Web Services (AWS) de forma local mediante Floci, sin costos ni necesidad de una cuenta de AWS.

## Servicios Utilizados

1. Amazon S3 (Almacenamiento de Archivos):
   Guarda y gestiona los archivos subidos.
   Permite listar, descargar y eliminar archivos.
   Calcula la cantidad total de archivos almacenados.

2. Amazon DynamoDB (Base de Datos NoSQL):
   Almacena los metadatos de cada archivo: id, nombre, tipo MIME, tamano, s3key, totalAlmacenamiento y fecha (con hora de Peru America/Lima).

3. AWS Lambda (Funciones Serverless):
   Funcion notificar: Procesa los metadatos y muestra en consola los datos del archivo subido y el conteo de almacenamiento.
   Funcion rutina_automatica: Tarea de monitoreo que consulta S3 y reporta el estado y total de archivos.

4. Amazon EventBridge Scheduler (Automatizacion por Horario):
   Ejecuta de forma periodica e independiente la funcion rutina_automatica segun la frecuencia configurada (ejemplo: cada 1 hora).

## Requisitos del Sistema

* Docker Desktop o Docker Engine (ejecutandose).
* Node.js (version 18 o superior) y npm.
* Git.

## Instalacion de Floci y del Proyecto

### 1. Clonar el repositorio

En Linux / macOS / Windows (Git Bash o Terminal):
```bash
git clone https://github.com/Pineda-25/Proyecto-AWS.git
cd Proyecto-AWS
```

### 2. Instalacion de Floci (Segun tu Sistema Operativo)

Opcion para Linux / macOS:
Metodo CLI:
```bash
curl -fsSL https://floci.io/install.sh | sh
floci start
```
Metodo Docker directo (alternativa):
```bash
docker run -d --name floci -p 4566:4566 -v /var/run/docker.sock:/var/run/docker.sock floci/floci:latest
```

Opcion para Windows:
Metodo PowerShell:
```powershell
iwr https://floci.io/install.ps1 | iex
floci start
```
Metodo Scoop:
```powershell
scoop bucket add floci https://github.com/floci-io/scoop-floci
scoop install floci
floci start
```
Metodo Docker Desktop directo (alternativa en PowerShell o CMD):
```powershell
docker run -d --name floci -p 4566:4566 -v //var/run/docker.sock:/var/run/docker.sock floci/floci:latest
```

Verificar que Floci este activo:
El endpoint local responde en: http://localhost:4566

### 3. Como ver la Interfaz Grafica (Web UI) de Floci

Floci cuenta con un panel visual para inspeccionar recursos desde el navegador web sin usar unicamente la terminal:

* Direccion de acceso:
  Abre en tu navegador: http://localhost:4566/_floci/ui
  (o tambien http://localhost:4500)

* Que puedes revisar en la UI:
  S3: Ver los buckets creados y los archivos almacenados.
  DynamoDB: Explorar las tablas e inspeccionar los items guardados con su fecha y metadatos.
  Lambda: Ver las funciones desplegadas (notificar y rutina_automatica).
  Scheduler: Ver las reglas de programacion horaria activas.

### 4. Instalar dependencias del proyecto Node.js

En la terminal, dentro de la carpeta Proyecto-AWS:
```bash
npm install
```

### 5. Configurar archivo .env

Crear el archivo .env en la raiz del proyecto con la siguiente configuracion:

En Linux / macOS:
```bash
cp env.example .env
```

En Windows (PowerShell):
```powershell
Copy-Item env.example .env
```

Contenido necesario dentro de .env:
```env
PORT=3000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566
AWS_S3_BUCKET=mi-bucket-archivos
AWS_S3_PREFIX=archivos/
AWS_DYNAMODB_TABLE=archivos
```

### 6. Crear recursos en Floci (Bucket, Tabla y Lambdas)

Ejecuta el script automatico que configura todo en Floci:
```bash
npm run setup:floci
```

## Gestion de Tareas Programadas (EventBridge Scheduler)

El Scheduler y la subida de archivos son tareas separadas e independientes.

* Crear un horario programado (ejemplo: cada 1 hora):
```bash
node scheduler.js crear reporte-hora "rate(1 hour)"
```

* Listar horarios programados activos:
```bash
npm run schedule:listar
```

* Ejecutar la rutina manualmente de inmediato (para pruebas sin esperar la hora):
```bash
npm run schedule:ejecutar
```

* Eliminar un horario programado:
```bash
node scheduler.js eliminar reporte-hora
```

## Manual Rapido de Ejecucion (Paso a Paso Completo)

Si ya tienes las herramientas instaladas, para poner a correr todo el proyecto solo sigue estos pasos:

Paso 1: Iniciar Floci
```bash
floci start
```
(Si usas Docker directo: docker start floci)

Paso 2: Inicializar o verificar los recursos de AWS en Floci
```bash
npm run setup:floci
```

Paso 3: Activar la tarea programada horaria (opcional)
```bash
node scheduler.js crear reporte-hora "rate(1 hour)"
```

Paso 4: Iniciar el servidor web
```bash
npm start
```

Paso 5: Probar la aplicacion
1. Abre en tu navegador http://localhost:3000 para subir archivos.
2. Abre http://localhost:3000/lista para ver, descargar o borrar archivos.
3. Abre http://localhost:4566/_floci/ui para ver visualmente el estado de S3, DynamoDB y Lambda en Floci.

## Estructura de Archivos

* index.js: Servidor Express, rutas web y llamadas a AWS SDK (S3, DynamoDB, Lambda).
* notificar.js: Codigo de la funcion Lambda que procesa la notificacion de subida.
* index_rutina.js: Codigo de la funcion Lambda de monitoreo ejecutada por el Scheduler.
* scheduler.js: CLI para crear, listar, ejecutar y eliminar horarios en EventBridge Scheduler.
* setup_floci.js: Script para inicializar de forma automatica el Bucket, la Tabla y las Lambdas en Floci.
* public/: Frontend de la aplicacion (index.html y lista.html).
* .env: Configuracion de credenciales y endpoints locales.
