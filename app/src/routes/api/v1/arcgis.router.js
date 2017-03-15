const Router = require('koa-router');
const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const Promise = require('bluebird');
const ArcgisService = require('services/arcgis.service');
const QueryService = require('services/query.service');
const FieldSerializer = require('serializers/field.serializer');
const passThrough = require('stream').PassThrough;
const ErrorSerializer = require('serializers/error.serializer');

const router = new Router({
    prefix: '/arcgis',
});

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

class ArcgisRouter {

    static getCloneUrl(url, idDataset) {
        return {
            http_method: 'POST',
            url: `/dataset/${idDataset}/clone`,
            body: {
                dataset: {
                    datasetUrl: url.replace('/featureservice', ''),
                    application: ['your', 'apps']
                }
            }
        };
    }

    static async query(ctx) {
        ctx.set('Content-type', 'application/json');
        const cloneUrl = ArcgisRouter.getCloneUrl(ctx.request.url, ctx.params.dataset);
        try {
            ctx.body = passThrough();
            const queryService = await new QueryService(ctx.query.sql, ctx.request.body.dataset, ctx.body, cloneUrl, false, null);
            await queryService.init();
            queryService.execute();
            logger.debug('Finished query');
        } catch (err) {
            ctx.body = ErrorSerializer.serializeError(err.statusCode || 500, err.error && err.error.error ? err.error.error[0] : err.message);
            ctx.status = 500;
        }
    }

    static async download(ctx) {
        try {
            ctx.body = passThrough();
            const format = ctx.query.format ? ctx.query.format : 'csv';
            let mimetype;
            switch (format) {

            case 'csv':
                mimetype = 'text/csv';
                break;
            case 'json':
            default:
                mimetype = 'application/json';
                break;

            }

            const cloneUrl = ArcgisRouter.getCloneUrl(ctx.request.url, ctx.params.dataset);
            const queryService = await new QueryService(ctx.query.sql, ctx.request.body.dataset, ctx.body, cloneUrl, true, format);
            await queryService.init();
            ctx.set('Content-disposition', `attachment; filename=${ctx.request.body.dataset.id}.${format}`);
            ctx.set('Content-type', mimetype);

            queryService.execute();
            logger.debug('Finished query');
        } catch (err) {
            ctx.body = ErrorSerializer.serializeError(err.statusCode || 500, err.error && err.error.error ? err.error.error[0] : err.message);
            ctx.status = 500;
        }
    }

    static async fields(ctx) {
        logger.info('Obtaining fields');
        const fields = await ArcgisService.getFields(ctx.request.body.dataset.connectorUrl, ctx.request.body.dataset.tableName);
        ctx.body = FieldSerializer.serialize(fields, ctx.request.body.dataset.tableName);
    }

    static async registerDataset(ctx) {
        logger.info('Registering dataset with data', ctx.request.body);
        try {
            await ArcgisService.getFields(ctx.request.body.connector.connector_url, ctx.request.body.connector.table_name);
            await ctRegisterMicroservice.requestToMicroservice({
                method: 'PATCH',
                uri: `/dataset/${ctx.request.body.connector.id}`,
                body: {
                    dataset: {
                        status: 1
                    }
                },
                json: true
            });
        } catch (e) {
            await ctRegisterMicroservice.requestToMicroservice({
                method: 'PATCH',
                uri: `/dataset/${ctx.request.body.connector.id}`,
                body: {
                    dataset: {
                        status: 2
                    }
                },
                json: true
            });
        }
        ctx.body = {};
    }

}

const deserializer = (obj) => (new Promise((resolve, reject) => {
    new JSONAPIDeserializer({
        keyForAttribute: 'camelCase'
    }).deserialize(obj, (err, data) => {
        if (err) {
            reject(err);
            return;
        }
        resolve(data);
    });
}));

const sanitizeUrl = async (ctx, next) => {
    if (ctx.request.body.dataset && ctx.request.body.dataset.connectorUrl && /\/u/.test(ctx.request.body.dataset.connectorUrl)) {
        const user = ctx.request.body.dataset.connectorUrl.split(/\/u|\/table/)[1].replace('/', '');
        ctx.request.body.dataset.connectorUrl = `https://${user}.carto.com/api/v2/sql`;
    } else if (ctx.request.body.connector && ctx.request.body.connector.connector_url && /\/u/.test(ctx.request.body.connector.connector_url)) {
        const user = ctx.request.body.connector.connector_url.split(/\/u|\/table/)[1].replace('/', '');
        ctx.request.body.connector.connector_url = `https://${user}.carto.com/api/v2/sql`;
    }
    await next();
};

const deserializeDataset = async(ctx, next) => {
    logger.debug('Body', ctx.request.body);
    if (ctx.request.body.dataset && ctx.request.body.dataset.data) {
        ctx.request.body.dataset = await deserializer(ctx.request.body.dataset);
    } else {
        if (ctx.request.body.dataset && ctx.request.body.dataset.table_name) {
            ctx.request.body.dataset.tableName = ctx.request.body.dataset.table_name;
        }
    }
    await next();
};


const toSQLMiddleware = async(ctx, next) => {
    const options = {
        method: 'GET',
        json: true,
        resolveWithFullResponse: true,
        simple: false
    };
    if (!ctx.query.sql && !ctx.request.body.sql && !ctx.query.outFields && !ctx.query.outStatistics) {
        ctx.throw(400, 'sql or fs required');
        return;
    }

    if (ctx.query.sql || ctx.request.body.sql) {
        logger.debug('Checking sql correct');
        const params = Object.assign({}, ctx.query, ctx.request.body);
        options.uri = `/convert/sql2SQL?sql=${params.sql}`;
        if (params.geostore) {
            options.uri += `&geostore=${params.geostore}`;
        }
    } else {
        logger.debug('Obtaining sql from featureService');
        const fs = Object.assign({}, ctx.request.body);
        delete fs.dataset;
        const query = serializeObjToQuery(ctx.request.query);
        const body = serializeObjToQuery(fs);
        const resultQuery = Object.assign({}, query, body);

        if (resultQuery) {
            options.uri = `/convert/fs2SQL${resultQuery}&tableName=${ctx.request.body.dataset.tableName}`;
        } else {
            options.uri = `/convert/fs2SQL?tableName=${ctx.request.body.dataset.tableName}`;
        }
    }

    try {
        const result = await ctRegisterMicroservice.requestToMicroservice(options);

        if (result.statusCode === 204 || result.statusCode === 200) {
            ctx.query.sql = result.body.data.attributes.query;
            await next();
        } else {
            if (result.statusCode === 400) {
                ctx.status = result.statusCode;
                ctx.body = result.body;
            } else {
                ctx.throw(result.statusCode, result.body);
            }
        }

    } catch (e) {
        if (e.errors && e.errors.length > 0 && e.errors[0].status >= 400 && e.errors[0].status < 500) {
            ctx.status = e.errors[0].status;
            ctx.body = e;
        } else {
            throw e;
        }
    }
};

router.post('/query/:dataset', deserializeDataset, toSQLMiddleware, sanitizeUrl, ArcgisRouter.query);
router.post('/download/:dataset', deserializeDataset, toSQLMiddleware, sanitizeUrl, ArcgisRouter.download);
router.post('/fields/:dataset', deserializeDataset, sanitizeUrl, ArcgisRouter.fields);
router.post('/rest-datasets/featureservice', sanitizeUrl, ArcgisRouter.registerDataset);

module.exports = router;
