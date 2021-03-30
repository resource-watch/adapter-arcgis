const Router = require('koa-router');
const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const ArcgisService = require('services/arcgis.service');
const QueryService = require('services/query.service');
const FieldSerializer = require('serializers/field.serializer');
const passThrough = require('stream').PassThrough;
const ErrorSerializer = require('serializers/error.serializer');
const ArcgisServerError = require('errors/arcgis-server.error');
const DatasetMiddleware = require('middleware/dataset.middleware');

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
                    datasetUrl: url.replace('/arcgis', ''),
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
            const format = ctx.query.format ? ctx.query.format : 'json';
            const queryService = await new QueryService(ctx.query.sql, ctx.state.jsonSql, ctx.request.body.dataset, ctx.body, cloneUrl, false, format);
            await queryService.execute();
            logger.debug('Finished query');
        } catch (err) {
            if (err instanceof ArcgisServerError) {
                ctx.body = ErrorSerializer.serializeArcgisServerErrors(err);
                ctx.status = 500;
            } else {
                ctx.body = ErrorSerializer.serializeError(err.statusCode || 500, err.error && err.error.error ? err.error.error[0] : err.message);
                ctx.status = 500;
            }

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
            const queryService = await new QueryService(ctx.query.sql, ctx.state.jsonSql, ctx.request.body.dataset, ctx.body, cloneUrl, true, format);

            ctx.set('Content-disposition', `attachment; filename=${ctx.request.body.dataset.id}.${format}`);
            ctx.set('Content-type', mimetype);

            await queryService.execute();
            logger.debug('Finished query');
        } catch (err) {
            ctx.body = ErrorSerializer.serializeError(err.statusCode || 500, err.error && err.error.error ? err.error.error[0] : err.message);
            ctx.status = 500;
        }
    }

    static async fields(ctx) {
        logger.info('Obtaining fields');
        const fields = await ArcgisService.getFields(ctx.request.body.dataset.connectorUrl);
        ctx.body = FieldSerializer.serialize(fields, ctx.request.body.dataset.tableName);
    }

    static async deleteDataset(ctx) {
        logger.info('Delete featureservice dataset');
        ctx.body = {};
        ctx.status = 204;
    }

    static async registerDataset(ctx) {
        logger.info('Registering dataset with data', ctx.request.body);
        try {
            await ArcgisService.getFields(ctx.request.body.connector.connector_url);
            await RWAPIMicroservice.requestToMicroservice({
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
            await RWAPIMicroservice.requestToMicroservice({
                method: 'PATCH',
                uri: `/dataset/${ctx.request.body.connector.id}`,
                body: {
                    dataset: {
                        status: 2,
                        errorMessage: `${e.name} - ${e.message}`
                    }
                },
                json: true
            });
        }
        ctx.body = {};
    }

}

const queryMiddleware = async (ctx, next) => {
    const options = {
        method: 'GET',
        json: true,
        resolveWithFullResponse: true,
        simple: false
    };
    if (!ctx.query.sql && !ctx.request.body.sql && !ctx.query.outFields && !ctx.query.outStatistics && !ctx.query.returnCountOnly) {
        ctx.throw(400, 'sql or fs required');
        return;
    }

    if (ctx.query.sql || ctx.request.body.sql) {
        logger.debug('Checking sql correct');
        const params = { ...ctx.query, ...ctx.request.body };
        options.uri = `/convert/sql2FS?sql=${encodeURI(params.sql)}`;
        if (params.geostore) {
            options.uri += `&geostore=${params.geostore}`;
        }
        if (params.geojson) {
            options.method = 'POST';
            options.body = {
                geojson: ctx.request.body.geojson
            };
        }

        if (params.format !== 'geojson') {
            if (options.method === 'POST') {
                options.excludeGeometries = true;
            } else {
                options.uri += `&excludeGeometries=true`;
            }
        }

        try {
            const result = await RWAPIMicroservice.requestToMicroservice(options);

            if (result.statusCode === 204 || result.statusCode === 200) {
                const json2sql = result.body.data.attributes.jsonSql;
                // convert alias in groupby
                if (result.body.data.attributes.fs.groupByFieldsForStatistics) {
                    const groups = result.body.data.attributes.fs.groupByFieldsForStatistics.split(',');
                    for (let j = 0; j < groups.length; j += 1) {
                        for (let i = 0; i < json2sql.select.length; i += 1) {
                            if (json2sql.select[i].type === 'literal') {
                                if (groups[j] === json2sql.select[i].alias) {
                                    groups[j] = json2sql.select[i].value;
                                }
                            }
                        }
                    }
                    result.body.data.attributes.fs.groupByFieldsForStatistics = groups.join(',');
                }

                ctx.query.sql = `?${serializeObjToQuery(result.body.data.attributes.fs)}`;

                ctx.state.jsonSql = result.body.data.attributes.jsonSql;
            } else if (result.statusCode === 400) {
                ctx.status = result.statusCode;
                ctx.body = result.body;
            } else {
                ctx.throw(result.statusCode, result.body);
            }

        } catch (e) {
            if (e.errors && e.errors.length > 0 && e.errors[0].status >= 400 && e.errors[0].status < 500) {
                ctx.status = e.errors[0].status;
                ctx.body = e;
            } else {
                throw e;
            }
        }
    } else {
        // fs provided
        const params = { ...ctx.query, ...ctx.request.body };
        delete params.dataset;
        delete params.loggedUser;
        if (!params.where) {
            params.where = '1=1';
        }
        let esriJson = null;
        if (params.geostore) {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: `/geostore/${params.geostore}?format=esri`,
                method: 'GET',
                json: true,
            });
            esriJson = result.data.attributes.esrijson;
        }
        if (params.geojson) {
            esriJson = params.geojson;
        }
        delete params.geojson;
        delete params.geostore;
        ctx.query.sql = `?${serializeObjToQuery(params)}`;
        if (esriJson) {
            ctx.query.sql += `&geometryType=esriGeometryPolygon&spatialRel=esriSpatialRelIntersects&inSR={"wkid":4326}&geometry=${JSON.stringify(esriJson)}`;
        }
    }
    await next();
};

router.get('/query/:dataset', DatasetMiddleware.getDatasetById, queryMiddleware, ArcgisRouter.query);
router.get('/download/:dataset', DatasetMiddleware.getDatasetById, queryMiddleware, ArcgisRouter.download);
router.post('/download/:dataset', DatasetMiddleware.getDatasetById, queryMiddleware, ArcgisRouter.download);
router.get('/fields/:dataset', DatasetMiddleware.getDatasetById, ArcgisRouter.fields);
router.post('/rest-datasets/featureservice', ArcgisRouter.registerDataset);
router.delete('/rest-datasets/featureservice/:dataset', ArcgisRouter.deleteDataset);

module.exports = router;
