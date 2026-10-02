const express = require('express');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;
const BUCKET = process.env.AWS_S3_BUCKET || 'mi-bucket-archivos';
const PREFIX = process.env.AWS_S3_PREFIX || '';

// Configuracion compartida para clientes de AWS / Floci
const awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
    },
    forcePathStyle: true
};

const s3 = new S3Client(awsConfig);
const dynamo = new DynamoDBClient(awsConfig);
const lambda = new LambdaClient(awsConfig);

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/lista', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lista.html')));

// Subida de archivos (S3 + DynamoDB + Lambda)
app.post('/upload', upload.single('archivo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Seleccione un archivo' });

        const fileName = req.file.originalname;
        const key = `${PREFIX}${fileName}`;

        // 1. Guardar en S3
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        }));

        // 2. Contar archivos actuales en S3
        const listData = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX }));
        const totalArchivos = (listData.Contents || []).filter(o => o.Key !== PREFIX).length;

        // 3. Formatear datos
        const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
        const tamanoKB = (req.file.size / 1024).toFixed(2) + ' KB';
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        // 4. Registrar en DynamoDB
        await dynamo.send(new PutItemCommand({
            TableName: process.env.AWS_DYNAMODB_TABLE || 'archivos',
            Item: {
                id: { S: id },
                nombre: { S: fileName },
                tipo: { S: req.file.mimetype },
                tamano: { N: req.file.size.toString() },
                tamanoLegible: { S: tamanoKB },
                fecha: { S: fecha },
                s3key: { S: key },
                totalAlmacenamiento: { N: totalArchivos.toString() }
            }
        }));

        // 5. Notificar a Lambda
        const payload = JSON.stringify({
            archivo: fileName,
            tipo: req.file.mimetype,
            tamano: tamanoKB,
            tamanoBytes: req.file.size,
            fecha: fecha,
            totalAlmacenamiento: totalArchivos
        });

        const lambdaRes = await lambda.send(new InvokeCommand({
            FunctionName: 'notificar',
            Payload: Buffer.from(payload)
        }));

        console.log(`Subido a S3: ${key} (Total en S3: ${totalArchivos})`);
        console.log('NOTIFICACION LAMBDA:', Buffer.from(lambdaRes.Payload).toString());

        res.redirect('/lista');
    } catch (err) {
        console.error('Error al procesar archivo:', err.message);
        res.status(500).send('Error al procesar archivo');
    }
});

// Listar archivos desde S3
app.get('/api/archivos', async (req, res) => {
    try {
        const data = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX }));
        const archivos = (data.Contents || [])
            .filter(o => o.Key !== PREFIX)
            .map(o => ({
                nombre: o.Key.replace(PREFIX, ''),
                key: o.Key,
                tamano: o.Size,
                fecha: o.LastModified
            }));

        res.json({ success: true, bucket: BUCKET, total: archivos.length, archivos });
    } catch (err) {
        console.error('Error al listar archivos:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Descargar archivo de S3
app.get('/api/descargar', async (req, res) => {
    try {
        const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: req.query.key }));
        res.attachment(req.query.key);
        Body.pipe(res);
    } catch (err) {
        res.status(500).send('Error al descargar');
    }
});

// Eliminar archivo de S3
app.get('/api/eliminar', async (req, res) => {
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: req.query.key }));
        res.redirect('/lista');
    } catch (err) {
        res.status(500).send('Error al eliminar');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});