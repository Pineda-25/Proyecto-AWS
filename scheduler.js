const { SchedulerClient, CreateScheduleCommand, ListSchedulesCommand, DeleteScheduleCommand } = require('@aws-sdk/client-scheduler');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
require('dotenv').config();

const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
};

const scheduler = new SchedulerClient(config);
const lambda = new LambdaClient(config);

const [, , accion = 'ayuda', nombre = 'reporte-hora', expresion = 'rate(1 hour)'] = process.argv;

async function run() {
    try {
        if (accion === 'crear') {
            await scheduler.send(new CreateScheduleCommand({
                Name: nombre,
                ScheduleExpression: expresion,
                FlexibleTimeWindow: { Mode: 'OFF' },
                Target: {
                    Arn: `arn:aws:lambda:${config.region}:000000000000:function:rutina_automatica`,
                    RoleArn: 'arn:aws:iam::000000000000:role/scheduler-role'
                }
            }));
            console.log(`Horario '${nombre}' creado con frecuencia '${expresion}'.`);
        } else if (accion === 'listar') {
            const res = await scheduler.send(new ListSchedulesCommand({}));
            const list = res.Schedules || [];
            if (!list.length) return console.log('No hay horarios activos.');
            list.forEach((s, i) => console.log(`[${i + 1}] ${s.Name} | ${s.State}`));
        } else if (accion === 'eliminar') {
            await scheduler.send(new DeleteScheduleCommand({ Name: nombre }));
            console.log(`Horario '${nombre}' eliminado.`);
        } else if (accion === 'ejecutar') {
            const res = await lambda.send(new InvokeCommand({ FunctionName: 'rutina_automatica' }));
            console.log('Resultado rutina:', JSON.parse(Buffer.from(res.Payload).toString()));
        } else {
            console.log('Comandos:');
            console.log('  node scheduler.js crear [nombre] [frecuencia]');
            console.log('  node scheduler.js listar');
            console.log('  node scheduler.js eliminar [nombre]');
            console.log('  node scheduler.js ejecutar');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
