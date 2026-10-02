# Proyecto AWS Local con Floci

Aplicacion web en Node.js y Express que integra y emula servicios de Amazon Web Services (AWS) de forma local mediante Floci, sin costos ni necesidad de una cuenta de AWS.

## Servicios Utilizados

1. Amazon S3 (Almacenamiento de Archivos):
   Guarda y gestiona los archivos subidos.
   Permite listar, descargar y eliminar archivos.
   Calcula la cantidad total de archivos almacenados.

2. Amazon DynamoDB (Base de Datos NoSQL):
   Almacena los metadatos de cada archivo: id, nombre, tipo MIME, tamano, s3key, totalAlmacenamiento y fecha (con zona horaria America/Lima).

3. AWS Lambda (Funciones Serverless):
   Funcion notificar: Procesa los metadatos y muestra en consola los datos del archivo subido y el conteo de almacenamiento.
   Funcion rutina_automatica: Tarea de monitoreo que consulta S3 y reporta el estado y total de archivos.

4. Amazon EventBridge Scheduler (Automatizacion por Horario):
   Ejecuta de forma periodica e independiente la funcion rutina_automatica segun la frecuencia configurada (ejemplo: cada 1 hora).

## Requisitos

* Docker
* Node.js (v18 o superior) y npm
* Git

## Instalacion y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/Pineda-25/Proyecto-AWS.git
cd Proyecto-AWS
```

### 2. Iniciar Floci (Emulador AWS)
Instalar el CLI de Floci si no esta instalado:
```bash
curl -fsSL https://floci.io/install.sh | sh
```

Iniciar los servicios locales:
```bash
floci start
```
El emulador queda disponible en http://localhost:4566.

### 3. Instalar dependencias
```bash
npm install
```

### 4. Configurar variables de entorno
Crear el archivo .env en la raiz con los siguientes valores:
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

### 5. Crear recursos en Floci (Bucket, Tabla y Lambdas)
Ejecutar el script automatizado:
```bash
npm run setup:floci
```

### 6. Iniciar la aplicacion
```bash
npm start
```
Acceder desde el navegador a: http://localhost:3000

## Uso de la Aplicacion Web

* Subir archivos (http://localhost:3000):
  Selecciona un archivo y haz clic en subir. El sistema lo almacena en S3, guarda sus datos en DynamoDB e invoca la Lambda notificar.
* Gestionar archivos (http://localhost:3000/lista):
  Muestra la tabla de archivos guardados con botones para descargar o eliminar.

## Gestion de Tareas Programadas (EventBridge Scheduler)

El Scheduler y la subida web son tareas independientes. Para administrar los horarios programados desde la terminal:

* Crear una regla programada (ejemplo: cada 1 hora):
```bash
node scheduler.js crear reporte-hora "rate(1 hour)"
```

* Listar horarios activos:
```bash
npm run schedule:listar
```

* Ejecutar la rutina manualmente para verificarla:
```bash
npm run schedule:ejecutar
```

* Eliminar una regla programada:
```bash
node scheduler.js eliminar reporte-hora
```

## Estructura de Archivos

* index.js: Servidor Express, rutas web y llamadas a AWS SDK (S3, DynamoDB, Lambda).
* notificar.js: Codigo de la Lambda que procesa la notificacion de subida.
* index_rutina.js: Codigo de la Lambda de monitoreo ejecutada por el Scheduler.
* scheduler.js: CLI para crear, listar, ejecutar y eliminar horarios en EventBridge Scheduler.
* setup_floci.js: Script para inicializar de forma automatica el Bucket, la Tabla y las Lambdas en Floci.
* public/: Frontend de la aplicacion (index.html y lista.html).
* .env: Configuracion de credenciales y endpoints locales.
