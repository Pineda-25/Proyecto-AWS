exports.handler = async (event) => {
    const hora = new Date().toLocaleTimeString('es-PE', {
        timeZone: 'America/Lima',
        hour12: true
    });

    console.log('------------------------------------------');
    console.log('RUTINA AUTOMATICA EJECUTADA CON EXITO');
    console.log('Hora local: ' + hora);
    console.log('Estado: Verificacion completada');
    console.log('------------------------------------------');

    return {
        statusCode: 200,
        mensaje: 'Ejecucion completada a las ' + hora
    };
};
