# Proyecto AWS con Floci (S3, DynamoDB, Lambda y EventBridge Scheduler)

Aplicacion web desarrollada en Node.js (Express) que implementa servicios de Amazon Web Services (AWS) emulados localmente al 100% mediante Floci, sin necesidad de cuentas de AWS ni costes de infraestructura.

## Que hace la aplicacion

1. Amazon S3 (Almacenamiento de Archivos):
   Subida de archivos a un bucket S3.
   Listado, descarga y eliminacion de archivos guardados en el bucket.
   Monitoreo en tiempo real del total de archivos almacenados.

2. Amazon DynamoDB (Base de Datos NoSQL):
   Registro de metadatos de cada archivo subido (id, nombre, tipo, tamano, fecha con hora exacta de Peru America/Lima, s3key y totalAlmacenamiento).

3. AWS Lambda (Computacion Serverless):
   Funcion notificar: Invocada automaticamente tras cada subida de archivo para procesar y mostrar en consola los detalles del documento, tamano, fecha y conteo total en almacenamiento.
   Funcion rutina_automatica: Tarea periodica de supervision que consulta el bucket S3 y reporta cuantos archivos existen.

4. Amazon EventBridge Scheduler (Automatizacion de Tareas por Horario):
   Programa la ejecucion periodica de la Lambda rutina_automatica (por ejemplo, cada minuto o cada hora) completamente por comandos de terminal (CLI), sin requerir consolas visuales.

## Requisitos Previos

Antes de comenzar, se debe tener instalado en el sistema:
* Docker (para ejecutar el emulador de Floci).
* Node.js (version 18 o superior) y npm.
* Git.

## Guia de Instalacion Paso a Paso

### Paso 1: Clonar el repositorio
Abrir una terminal y clonar el proyecto:
```bash
git clone https://github.com/Pineda-25/Proyecto-AWS.git
cd Proyecto-AWS
```

### Paso 2: Instalar e Iniciar Floci (AWS Local)
Instalar la herramienta CLI de Floci:
```bash
curl -fsSL https://floci.io/install.sh | sh
```

Iniciar el contenedor de Floci con los servicios de AWS:
```bash
floci start
```

Para verificar el estado de los servicios:
```bash
floci status
```
El endpoint local quedara escuchando en http://localhost:4566.

### Paso 3: Instalar las dependencias del proyecto
Dentro del directorio Proyecto-AWS, instalar los paquetes de Node.js:
```bash
npm install
```

### Paso 4: Configurar el archivo .env
Crear el archivo .env en la raiz del proyecto:
```bash
cp env.example .env
```

Contenido del archivo .env para conectarse a Floci:
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

### Paso 5: Inicializar los recursos en Floci por comando
Ejecutar el script que crea el Bucket de S3, la tabla de DynamoDB y despliega las funciones Lambda (notificar y rutina_automatica):
```bash
npm run setup:floci
```

## Ejecucion de la Aplicacion

Iniciar el servidor web:
```bash
npm start
```

Abrir el navegador en:
http://localhost:3000

Funcionalidades Web:
* Subida (/): Selecciona y sube un archivo. El sistema guarda el archivo en S3, calcula la cantidad de archivos en almacenamiento, registra los metadatos en DynamoDB con la fecha y hora de Peru, e invoca la funcion Lambda notificar mostrando los datos en la terminal.
* Listado y Gestion (/lista): Visualiza los archivos almacenados con opciones de descarga y eliminacion.

## Lambda y EventBridge Scheduler por Comandos

Para programar tareas automaticas periodicas sin usar consolas graficas:

### Opcion A: Usando los scripts de NPM (Recomendado)

1. Crear una tarea programada (Scheduler):
```bash
npm run schedule:crear
```
Crea una regla para ejecutar la rutina cada 1 minuto (rate(1 minute)).

Tambien se puede personalizar el nombre y la frecuencia:
```bash
node scheduler.js crear mi-alerta "rate(5 minutes)"
node scheduler.js crear reporte-diario "cron(0 12 * * ? *)"
```

2. Listar las tareas programadas activas:
```bash
npm run schedule:listar
```

3. Ejecutar la rutina manualmente de inmediato (para pruebas):
```bash
npm run schedule:ejecutar
```

Respuesta en consola:
```json
{
  "statusCode": 200,
  "mensaje": "Ejecucion completada a las 6:13:03 p. m. (2/10/2026)",
  "totalArchivosS3": 4,
  "fecha": "2/10/2026, 6:13:03 p. m."
}
```

4. Eliminar una tarea programada:
```bash
npm run schedule:eliminar
```
O indicando un nombre especifico:
```bash
node scheduler.js eliminar rutina-cada-minuto
```

### Opcion B: Usando AWS CLI apuntando a Floci

Si se utiliza aws-cli, configurar las credenciales locales:
```bash
aws configure set aws_access_key_id test
aws configure set aws_secret_access_key test
aws configure set default.region us-east-1
aws configure set default.endpoint_url http://localhost:4566
```

Comandos disponibles:
```bash
# Listar buckets S3
aws s3 ls

# Listar registros en DynamoDB
aws dynamodb scan --table-name archivos

# Crear una programacion con Scheduler
aws scheduler create-schedule \
  --name "rutina-cli" \
  --schedule-expression "rate(1 minute)" \
  --flexible-time-window "Mode=OFF" \
  --target '{"Arn":"arn:aws:lambda:us-east-1:000000000000:function:rutina_automatica","RoleArn":"arn:aws:iam::000000000000:role/scheduler-role"}'

# Listar programaciones
aws scheduler list-schedules

# Invocar la Lambda manualmente
aws lambda invoke --function-name rutina_automatica salida.json && cat salida.json
```

## Estructura del Proyecto

```text
Proyecto-AWS/
├── .env                  # Variables de entorno con el endpoint de Floci
├── env.example           # Plantilla de variables de entorno
├── index.js              # Servidor Express, endpoints y logica de AWS SDK
├── notificar.js          # Codigo de la funcion Lambda de notificacion
├── index_rutina.js       # Codigo de la funcion Lambda para la rutina programada
├── scheduler.js          # Herramienta CLI para gestionar EventBridge Scheduler
├── setup_floci.js        # Script de inicializacion de S3, DynamoDB y Lambdas
├── public/               # Frontend (HTML, CSS, JS del cliente)
│   ├── index.html        # Pagina principal de subida de archivos
│   └── lista.html        # Pagina de visualizacion y gestion de archivos
└── package.json          # Dependencias y scripts de ejecucion
```
