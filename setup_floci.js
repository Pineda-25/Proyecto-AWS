const fs = require('fs');
const { execSync } = require('child_process');
const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { LambdaClient, CreateFunctionCommand, GetFunctionCommand, UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand } = require('@aws-sdk/client-lambda');
require('dotenv').config();

const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    forcePathStyle: true
};

const s3 = new S3Client(config);
const dynamo = new DynamoDBClient(config);
const lambda = new LambdaClient(config);

async function deployLambda(name, file, handler) {
    if (!fs.existsSync(file)) return;
    const zipName = `_${name}.zip`;
    execSync(`zip -q ${zipName} ${file}`);
    const zipBytes = fs.readFileSync(zipName);

    try {
        await lambda.send(new GetFunctionCommand({ FunctionName: name }));
        await lambda.send(new UpdateFunctionCodeCommand({ FunctionName: name, ZipFile: zipBytes }));
        await lambda.send(new UpdateFunctionConfigurationCommand({ FunctionName: name, Handler: handler }));
        console.log(`Lambda '${name}' actualizada.`);
    } catch {
        await lambda.send(new CreateFunctionCommand({
            FunctionName: name,
            Runtime: 'nodejs20.x',
            Role: 'arn:aws:iam::000000000000:role/lambda-role',
            Handler: handler,
            Code: { ZipFile: zipBytes }
        }));
        console.log(`Lambda '${name}' creada.`);
    } finally {
        fs.unlinkSync(zipName);
    }
}

async function setup() {
    console.log('Inicializando recursos en Floci...');

    // 1. S3 Bucket
    const bucket = process.env.AWS_S3_BUCKET || 'mi-bucket-archivos';
    try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
        console.log(`Bucket '${bucket}' ya existe.`);
    } catch {
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log(`Bucket '${bucket}' creado.`);
    }

    // 2. DynamoDB Table
    const table = process.env.AWS_DYNAMODB_TABLE || 'archivos';
    try {
        await dynamo.send(new DescribeTableCommand({ TableName: table }));
        console.log(`Tabla '${table}' ya existe.`);
    } catch {
        await dynamo.send(new CreateTableCommand({
            TableName: table,
            KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
            AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
            BillingMode: 'PAY_PER_REQUEST'
        }));
        console.log(`Tabla '${table}' creada.`);
    }

    // 3. Lambdas
    await deployLambda('notificar', 'notificar.js', 'notificar.handler');
    await deployLambda('rutina_automatica', 'index_rutina.js', 'index_rutina.handler');

    console.log('Recursos listos en Floci.');
}

setup().catch(err => console.error('Error setup:', err.message));
