# Proyecto AWS Local con Floci (S3, DynamoDB, Lambda y EventBridge Scheduler)

Guia completa y documentacion para emular y consumir servicios de Amazon Web Services (AWS) de forma local utilizando Floci, sin requerir una cuenta de AWS ni generar costos.

## Conceptos Fundamentales

* CLI (Command Line Interface): Interfaz de linea de comandos para interactuar con el sistema y los servicios mediante instrucciones de texto.
* GUI (Graphical User Interface): Interfaz grafica de usuario para interactuar de forma visual mediante botones y pantallas (navegador o aplicaciones de escritorio).

## Requisitos del Sistema

0. Tener instalado y en ejecucion Docker Desktop (en Windows o macOS) o Docker Engine (en Linux).
1. Node.js (version 18 o superior) y npm.
2. Git.

## Guia de Instalacion y Configuracion Base

### 1. Instalacion de Floci

En Windows (PowerShell como Administrador):
```powershell
iwr https://floci.io/install.ps1 | iex
```
Al finalizar, cerrar y volver a abrir PowerShell como Administrador.

En Linux / macOS:
```bash
curl -fsSL https://floci.io/install.sh | sh
```

### 2. Iniciar el contenedor de Floci

Ejecutar el comando de arranque:
```bash
floci start
```
Se descargara y configurara automaticamente el contenedor en Docker.
Abrir Docker Desktop y verificar que el contenedor llamado floci se encuentre en ejecucion (puerto 4566).

Comandos utiles de control:
* floci start: Inicia el contenedor de emulacion.
* floci stop: Detiene el contenedor.
* floci doctor: Realiza un diagnostico completo de Docker y del entorno (debe mostrar: All checks passed).

### 3. Instalacion de AWS CLI

Para interactuar por comandos con los servicios emulados en Floci:

En Windows (PowerShell como Administrador):
```powershell
irm https://awscli.amazonaws.com/v2/install.ps1 | iex
```
Al finalizar, cerrar y volver a abrir PowerShell como Administrador.

En Linux:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
```

Verificar la instalacion:
```bash
aws --version
```

### 4. Configurar AWS CLI para Floci

En Windows (PowerShell):
```powershell
floci env --shell powershell | Invoke-Expression
```

Nota alternativa en caso de que Invoke-Expression presente restricciones en PowerShell:
Ingresar manualmente en PowerShell:
```powershell
$env:AWS_ENDPOINT_URL = 'http://localhost.floci.io:4566'
$env:AWS_ACCESS_KEY_ID = 'test'
$env:AWS_SECRET_ACCESS_KEY = 'test'
$env:AWS_DEFAULT_REGION = 'us-east-1'
```

En Linux / macOS (Bash o Zsh):
```bash
eval $(floci env)
```

O configuracion global permanente para AWS CLI:
```bash
aws configure set aws_access_key_id test
aws configure set aws_secret_access_key test
aws configure set default.region us-east-1
aws configure set default.endpoint_url http://localhost:4566
```

### 5. Verificar variables de entorno

En PowerShell:
```powershell
$env:AWS_ENDPOINT_URL
# Resultado: http://localhost.floci.io:4566

$env:AWS_DEFAULT_REGION
# Resultado: us-east-1
```

Resumen de lo logrado hasta este punto:
a. Instalacion de componentes: Docker Desktop, Floci, AWS CLI y Node.js.
b. Configuracion de Floci, AWS y variables de entorno locales.
c. Inicio y diagnostico saludable de los servicios con floci doctor.

Servicios integrados en Floci:
S3, DynamoDB, Lambda, EventBridge Scheduler, API Gateway, SQS, IAM.

## Pruebas y Verificacion de Floci con AWS CLI

Sintaxis general: aws [servicio] [accion]

### 1. Verificar servicio S3
```bash
aws s3 ls
```
Retorna vacio si aun no existen buckets.

### 2. Creacion de un Bucket (Contenedor en S3)
```bash
aws s3 mb s3://laboratorio-floci
```
Resultado: make_bucket: laboratorio-floci

Flujo de trabajo (WorkFlow):
PC ==> AWS CLI ==> AWS_ENDPOINT_URL (http://localhost:4566) ==> FLOCI ==> S3 ==> laboratorio-floci

### 3. Conceptos Clave de Amazon S3

* Bucket: Contenedor principal donde se almacenan los archivos (ejemplo: laboratorio-floci o mi-bucket-archivos).
* Object: Archivo binario o documento almacenado (ejemplo: laptop.jpg o documento.pdf).
* Key: Nombre y ruta logica completa del objeto dentro del bucket (ejemplo: imagenes/productos/laptop.jpg).

### 4. Prueba manual de subida y descarga (PowerShell / Terminal)

Crear un archivo de prueba:
En PowerShell:
```powershell
"este es un mensaje contenido en un archivo de texto" | Out-File mensaje.txt
```
En Linux:
```bash
echo "este es un mensaje contenido en un archivo de texto" > mensaje.txt
```

Subir el archivo al Bucket en S3:
```bash
aws s3 cp mensaje.txt s3://laboratorio-floci
```
Resultado: upload: ./mensaje.txt to s3://laboratorio-floci/mensaje.txt

Verificar la existencia del archivo en el Bucket:
```bash
aws s3 ls s3://laboratorio-floci
```

Descargar el archivo desde S3:
```bash
aws s3 cp s3://laboratorio-floci/mensaje.txt ./mensaje_descargado.txt
```

## Construccion y Ejecucion de la App Web (Node.js + Express)

La aplicacion conecta una interfaz web con S3, DynamoDB, Lambda y EventBridge Scheduler.

### 1. Clonar el repositorio del proyecto
```bash
git clone https://github.com/Pineda-25/Proyecto-AWS.git
cd Proyecto-AWS
```

### 2. Dependencias del proyecto
Instalar las librerias requeridas:
```bash
npm install
```

Librerias utilizadas:
* express: Framework backend para crear el servidor web y rutas HTTP.
* multer: Middleware para recibir y gestionar archivos binarios subidos por formularios.
* dotenv: Carga y gestion de variables de entorno desde el archivo .env.
* @aws-sdk/client-s3: SDK oficial de AWS para interactuar con S3 (subida, listado, descarga, eliminacion).
* @aws-sdk/client-dynamodb: SDK oficial para registrar metadatos en tablas NoSQL.
* @aws-sdk/client-lambda: SDK oficial para invocar funciones serverless.
* @aws-sdk/client-scheduler: SDK para programar tareas automaticas recurrentes.

### 3. Configuracion del archivo .env
Crear el archivo .env en la raiz del proyecto:

En Windows (PowerShell):
```powershell
Copy-Item env.example .env
```
En Linux / macOS:
```bash
cp env.example .env
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

### 4. Inicializacion de recursos en Floci por comando
Ejecuta el script automatico para crear el Bucket en S3, la tabla en DynamoDB y las funciones Lambda:
```bash
npm run setup:floci
```

### 5. Iniciar la aplicacion web
```bash
npm start
```
Abrir el navegador en:
http://localhost:3000

Funcionalidades en la web:
* Subida (/): Permite subir cualquier archivo. Guarda el objeto en S3, calcula la cantidad total de archivos, registra los datos en DynamoDB con la hora exacta de Peru (America/Lima) y dispara la Lambda de notificacion.
* Listado y descarga (/lista): Permite visualizar todos los archivos guardados, descargarlos o eliminarlos.

## Gestion de Tareas Programadas (EventBridge Scheduler)

El Scheduler es un servicio de automatizacion por horario que funciona de forma independiente a la subida web:

* Crear una tarea programada horaria:
```bash
node scheduler.js crear reporte-hora "rate(1 hour)"
```

* Listar los horarios programados activos:
```bash
npm run schedule:listar
```

* Ejecutar la rutina manualmente de inmediato (prueba rapida):
```bash
npm run schedule:ejecutar
```

* Eliminar una tarea programada:
```bash
node scheduler.js eliminar reporte-hora
```

## Monitoreo por GUI (Interfaz Grafica de Floci)

Floci incluye una consola web visual para inspeccionar los recursos creados:

* Direccion de acceso en el navegador:
  http://localhost:4566/_floci/ui
  (o alternativamente http://localhost:4500)

* Que se puede inspeccionar:
  S3: Ver los buckets creados y navegar entre los archivos guardados.
  DynamoDB: Consultar las tablas y explorar los registros con sus claves y fechas.
  Lambda: Inspeccionar las funciones notificar y rutina_automatica.
  Scheduler: Visualizar los horarios y reglas activas.

## Manual Rapido de Ejecucion (Resumen Paso a Paso)

1. Iniciar Floci:
   floci start

2. Inicializar recursos locales:
   npm run setup:floci

3. Iniciar la aplicacion web:
   npm start

4. Abrir en el navegador:
   App Web: http://localhost:3000
   Panel GUI Floci: http://localhost:4566/_floci/ui

5. Activar o probar la tarea de Scheduler (opcional):
   npm run schedule:ejecutar
