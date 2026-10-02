exports.handler = async (event) => {
    const data = typeof event === 'string' ? JSON.parse(event) : (event || {});

    console.log('NOTIFICACION: ARCHIVO PROCESADO');
    console.log(`Documento:   ${data.archivo || 'N/A'}`);
    console.log(`Tipo:        ${data.tipo || 'N/A'}`);
    console.log(`Tamano:      ${data.tamano || 'N/A'}`);
    console.log(`Fecha:       ${data.fecha || 'N/A'}`);
    console.log(`Total en S3: ${data.totalAlmacenamiento ?? 0}`);

    return {
        statusCode: 200,
        mensaje: `Archivo ${data.archivo} notificado`,
        ...data
    };
};
