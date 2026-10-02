exports.handler = async (event) => {
    let data = event;
    if (typeof event === 'string') {
        try {
            data = JSON.parse(event);
        } catch (_) {}
    }

    console.log('NOTIFICACION: ARCHIVO PROCESADO');
    console.log(`Documento:             ${data.archivo || 'N/A'}`);
    console.log(`Tipo de documento:     ${data.tipo || 'N/A'}`);
    console.log(`Tamaño:                ${data.tamano || data.tamanoBytes + ' bytes'}`);
    console.log(`Fecha:                 ${data.fecha || 'N/A'}`);
    console.log(`En almacenamiento S3:  ${data.totalAlmacenamiento !== undefined ? data.totalAlmacenamiento + ' archivo(s)' : 'N/A'}`);

    return {
        statusCode: 200,
        mensaje: `Archivo ${data.archivo} notificado correctamente`,
        archivo: data.archivo,
        tipo: data.tipo,
        tamano: data.tamano,
        fecha: data.fecha,
        totalAlmacenamiento: data.totalAlmacenamiento
    };
};
