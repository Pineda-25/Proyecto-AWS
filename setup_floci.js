const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { LambdaClient, CreateFunctionCommand, GetFunctionCommand } = require('@aws-sdk/client-lambda');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
  },
  forcePathStyle: true
};

async function setup() {
  console.log('Inicializando recursos en Floci (AWS Local)...');

  // 1. S3 Bucket
  const s3 = new S3Client(config);
  const bucketName = process.env.AWS_S3_BUCKET || 'mi-bucket-archivos';
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`Bucket S3 '${bucketName}' ya existe.`);
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log(`Bucket S3 '${bucketName}' creado exitosamente.`);
    } catch (err) {
      console.error(`Error al crear bucket S3:`, err.message);
    }
  }

  // 2. DynamoDB Table
  const dynamo = new DynamoDBClient(config);
  const tableName = process.env.AWS_DYNAMODB_TABLE || 'archivos-tabla';
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`Tabla DynamoDB '${tableName}' ya existe.`);
  } catch {
    try {
      await dynamo.send(new CreateTableCommand({
        TableName: tableName,
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
      }));
      console.log(`Tabla DynamoDB '${tableName}' creada exitosamente.`);
    } catch (err) {
      console.error(`Error al crear tabla DynamoDB:`, err.message);
    }
  }

  // 3. Lambda 'notificar'
  const lambda = new LambdaClient(config);
  try {
    execSync('zip -q _notificar.zip notificar.js');
    const zipBytes = fs.readFileSync('_notificar.zip');

    try {
      const { UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand } = require('@aws-sdk/client-lambda');
      await lambda.send(new UpdateFunctionCodeCommand({
        FunctionName: 'notificar',
        ZipFile: zipBytes
      }));
      await lambda.send(new UpdateFunctionConfigurationCommand({
        FunctionName: 'notificar',
        Handler: 'notificar.handler'
      }));
      console.log(`Funcion Lambda 'notificar' actualizada exitosamente.`);
    } catch {
      await lambda.send(new CreateFunctionCommand({
        FunctionName: 'notificar',
        Runtime: 'nodejs20.x',
        Role: 'arn:aws:iam::000000000000:role/lambda-role',
        Handler: 'notificar.handler',
        Code: { ZipFile: zipBytes }
      }));
      console.log(`Funcion Lambda 'notificar' creada exitosamente.`);
    }
    fs.unlinkSync('_notificar.zip');
  } catch (err) {
    console.error(`Error al gestionar Lambda 'notificar':`, err.message);
  }

  // 4. Lambda 'rutina_automatica' (desde index_rutina.js)
  try {
    if (fs.existsSync('index_rutina.js')) {
      execSync('zip -q _rutina.zip index_rutina.js');
      const zipBytes = fs.readFileSync('_rutina.zip');
      const { UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand } = require('@aws-sdk/client-lambda');

      try {
        await lambda.send(new GetFunctionCommand({ FunctionName: 'rutina_automatica' }));
        await lambda.send(new UpdateFunctionCodeCommand({
          FunctionName: 'rutina_automatica',
          ZipFile: zipBytes
        }));
        await lambda.send(new UpdateFunctionConfigurationCommand({
          FunctionName: 'rutina_automatica',
          Handler: 'index_rutina.handler'
        }));
        console.log(`Funcion Lambda 'rutina_automatica' actualizada exitosamente.`);
      } catch {
        await lambda.send(new CreateFunctionCommand({
          FunctionName: 'rutina_automatica',
          Runtime: 'nodejs20.x',
          Role: 'arn:aws:iam::000000000000:role/lambda-role',
          Handler: 'index_rutina.handler',
          Code: { ZipFile: zipBytes }
        }));
        console.log(`Funcion Lambda 'rutina_automatica' creada exitosamente.`);
      }
      fs.unlinkSync('_rutina.zip');
    }
  } catch (err) {
    console.error(`Error al gestionar Lambda 'rutina_automatica':`, err.message);
  }

  console.log('Todos los recursos locales en Floci estan listos.');
}

setup();
