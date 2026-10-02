const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');

//Solicitud de los servicios de AWS S3 (Subir archivos a S3)
//Otorgar nuevo permiso (lectura)
const {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command
} = require('@aws-sdk/client-s3');

//DynamoDB - servicio BD noSQL
const {
    DynamoDBClient,
    PutItemCommand
} = require("@aws-sdk/client-dynamodb")

//LAMBDA
const {
    LambdaClient,
    InvokeCommand
} = require("@aws-sdk/client-lambda")

//Cargar variables de entorno
dotenv.config();

//Habilitar Framework Backend Express
const app = express();

//Leer algunas configuraciones
const PORT = process.env.PORT || 3000;
const BUCKET = process.env.AWS_S3_BUCKET;
const PREFIX = process.env.AWS_S3_PREFIX || '';

//Configuracion de multer (gestionar|subir archivos)
//Backend conservara una copia de manera temporal
const upload = multer({
    storage: multer.memoryStorage(),
})

//Cliente S3
// forcePathStyle : true _(modo compatibilidad)
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    forcePathStyle: true, // Necesario para LocalStack
})

//Cliente Dynameo
const dynamoDBClient = new DynamoDBClient({
   region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

//Cliente LAMBDA
const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

//Archivo estatico aplicacion => Frontend
app.use(express.static(path.join(__dirname, 'public')));

//Ruta => http://localhost:3000/
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//ruta para listar => http://localhost:3000/lista
app.get("/lista", (req, res) => {
  res.sendFile(path.join(__dirname,"public", "lista.html"))
})

//cuando el cliente suba el archvio , se utlizan 2 servicios
//S3    :alojatr el archvio 

//Ruta para subir archivos
app.post('/upload', upload.single('archivo'), async (req, res) => {
    try {

        //Verificar que se haya seleccionado un archivo
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se ha seleccionado ningún archivo'
            });
        }

        //NOTA: hace falta considerar otros tipos de validacion
        // Por ejemplo: validar el tamaño del archivo, el tipo de archivo, etc.

        //Obtener el nombre del archivo
        const fileName = req.file.originalname;

        //Ruta del archivo
        //mi-aplicacion/archivos/documento.pdf
        const key = `${PREFIX}${fileName}`;

        //Subir el archivo a S3
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        })

        //Ejecutar el comando para subir el archivo
        await s3Client.send(command);

        console.log(`Archivo subido a S3: ${key}`);

        //tambien.. uitlizaremos Dynamodb 
        const id= `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
        const dynamoCommand = new PutItemCommand({
            TableName: process.env.AWS_DYNAMODB_TABLE,
            Item: {
                id: {S:id},
                nombre: {S:fileName},
                tipo: {S:req.file.mimetype},
                tamano: {N:req.file.size.toString()},
                fecha: {S: new Date().toISOString},
                s3key: {S:key}
            }
        })

        //Ejecutar el dynamodb
        await dynamoDBClient.send(dynamoCommand)
        console.log("Registro en dynamo Creado")

        const payload = JSON.stringify({ archivo: fileName });
        const lambdaRes = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'notificar',
            Payload: Buffer.from(payload)
        }));
        console.log("NOTIFICACIÓN LAMBDA:", Buffer.from(lambdaRes.Payload).toString());

        // Respuesta final al cliente (una sola vez)
        res.redirect('/lista');

    } catch (e) {
        console.error("Error:", e.message);
        res.status(500).send('Error al procesar archivo');
    }
})

//Nueva operacion (Lectura desde AWS s3)
app.get("/api/archivos", async(req,res) => {
  try{

    //Comando para leer los archvios
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX
    })

    //consulta s3
    const data = await s3Client.send(command)

    //SI no pasa si no existe los archivos
    //1 ()  : Retorna un arreglo incluso sino existen archivos
    //2 ()  : Filtra la colecion
    // 3 () : Retorna los datos ya filtrados
    const archivos = (data.Contents || [])
      .filter(Objecto => Objecto.Key !== PREFIX)
      .map(Objecto => ({
        nombre: Objecto.Key.replace(PREFIX, ""),
        key: Objecto.Key,
        tamano: Objecto.Size,
        fecha: Objecto.LastModified
      }))

    //retornamos los datps
    res.json({
      success: true,
      bucket: BUCKET,
      prefijo: PREFIX,
      total: archivos.length,
      archivos: archivos
    })

  } catch(e){
    console.error(`Error al listar de archivos: `, e)
    res.status(500).json({
      success: false,
      message: 'No se puede acceder a los archivos',
      error: e.message
    })
  }
})

const { GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
app.get('/api/descargar', async (req,res) =>{
    const { Body } = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: req.query.key }))
    res.attachment(req.query.key);
    Body.pipe(res)
})

app.get('/api/eliminar', async (req, res) => {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: req.query.key }));
  res.redirect('/lista');
});



//Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});