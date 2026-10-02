const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    forcePathStyle: true
});

exports.handler = async () => {
    const fechaHora = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

    let totalArchivos = 0;
    try {
        const bucket = process.env.AWS_S3_BUCKET || 'mi-bucket-archivos';
        const prefix = process.env.AWS_S3_PREFIX || '';
        const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
        totalArchivos = (res.Contents || []).filter(o => o.Key !== prefix).length;
    } catch (e) {
        console.error('Error al consultar S3:', e.message);
    }

    console.log('RUTINA AUTOMATICA EJECUTADA CON EXITO');
    console.log(`Fecha: ${fechaHora} (America/Lima)`);
    console.log(`Total en S3: ${totalArchivos} archivos`);

    return {
        statusCode: 200,
        mensaje: `Ejecucion completada a las ${fechaHora}`,
        totalArchivosS3: totalArchivos,
        fecha: fechaHora
    };
};
