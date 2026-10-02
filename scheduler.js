const { 
    SchedulerClient, 
    CreateScheduleCommand, 
    ListSchedulesCommand, 
    DeleteScheduleCommand 
} = require('@aws-sdk/client-scheduler');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
require('dotenv').config();

const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
    }
};

const scheduler = new SchedulerClient(config);
const lambda = new LambdaClient(config);

const accion = process.argv[2] || 'ayuda';
const nombreHorario = process.argv[3] || 'rutina-cada-minuto';
const expresion = process.argv[4] || 'rate(1 minute)';

async function main() {
    switch (accion.toLowerCase()) {
        case 'crear': {
            console.log(`Creando horario '${nombreHorario}' con frecuencia '${expresion}'...`);
            try {
                const res = await scheduler.send(new CreateScheduleCommand({
                    Name: nombreHorario,
                    ScheduleExpression: expresion,
                    FlexibleTimeWindow: { Mode: 'OFF' },
                    Target: {
                        Arn: `arn:aws:lambda:${config.region}:000000000000:function:rutina_automatica`,
                        RoleArn: `arn:aws:iam::000000000000:role/scheduler-role`
                    }
                }));
                console.log('Horario creado exitosamente:');
                console.log('  ARN:', res.ScheduleArn);
                console.log('  Funcion destino: rutina_automatica');
                console.log(`  Frecuencia: ${expresion}`);
            } catch (err) {
                console.error('Error al crear horario:', err.message);
            }
            break;
        }

        case 'listar': {
            console.log('Listando horarios configurados en Floci...');
            try {
                const res = await scheduler.send(new ListSchedulesCommand({}));
                if (!res.Schedules || res.Schedules.length === 0) {
                    console.log('  No hay horarios programados actualmente');
                } else {
                    res.Schedules.forEach((s, idx) => {
                        console.log(`  [${idx + 1}] Nombre: ${s.Name} | Estado: ${s.State} | Destino: ${s.Target.Arn}`);
                    });
                }
            } catch (err) {
                console.error('Error al listar horarios:', err.message);
            }
            break;
        }

        case 'eliminar': {
            console.log(`Eliminando horario '${nombreHorario}'...`);
            try {
                await scheduler.send(new DeleteScheduleCommand({ Name: nombreHorario }));
                console.log(`Horario '${nombreHorario}' eliminado exitosamente.`);
            } catch (err) {
                console.error('Error al eliminar horario:', err.message);
            }
            break;
        }

        case 'ejecutar': {
            console.log('Ejecutando manualmente la funcion Lambda rutina_automatica...');
            try {
                const res = await lambda.send(new InvokeCommand({
                    FunctionName: 'rutina_automatica',
                    Payload: Buffer.from(JSON.stringify({ trigger: 'manual-cli' }))
                }));
                const salida = Buffer.from(res.Payload).toString();
                console.log('Respuesta de la rutina:');
                try {
                    console.log(JSON.parse(salida));
                } catch (_) {
                    console.log(salida);
                }
            } catch (err) {
                console.error('Error al ejecutar rutina:', err.message);
            }
            break;
        }

        default: {
            console.log('USO DE SCHEDULER CLI (EventBridge Scheduler)');
            console.log('Comandos disponibles:');
            console.log('  node scheduler.js crear [nombre] [frecuencia]');
            console.log('    Ejemplo: node scheduler.js crear rutina-cada-minuto "rate(1 minute)"');
            console.log('    Ejemplo: node scheduler.js crear rutina-cada-5min "rate(5 minutes)"');
            console.log('    Ejemplo: node scheduler.js crear rutina-diaria "cron(0 12 * * ? *)"');
            console.log('');
            console.log('  node scheduler.js listar');
            console.log('    Lista todos los horarios activos.');
            console.log('');
            console.log('  node scheduler.js eliminar [nombre]');
            console.log('    Elimina el horario especificado.');
            console.log('');
            console.log('  node scheduler.js ejecutar');
            console.log('    Prueba y ejecuta inmediatamente la Lambda rutina_automatica.');
            break;
        }
    }
}

main();
