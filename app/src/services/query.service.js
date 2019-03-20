const logger = require('logger');
const ArcgisServerError = require('errors/arcgis-server.error');
const ArcgisService = require('services/arcgis.service');
const arcgis = require('terraformer-arcgis-parser');
const JSONStream = require('JSONStream');
const json2csv = require('json2csv');

function getNameColumnFunction(column) {
    let name = `${column.value}(`;
    for (let i = 0, { length } = column.arguments; i < length; i += 1) {
        name += column.arguments[i].value;
    }
    name += ')';
    return name;
}

class QueryService {

    constructor(sql, jsonSql, dataset, passthrough, cloneUrl, download, downloadType) {
        this.sql = sql;
        this.jsonSql = jsonSql;
        this.dataset = dataset;
        this.passthrough = passthrough;
        this.cloneUrl = cloneUrl;
        this.download = download;
        this.downloadType = downloadType;
    }

    convertObject(data) {
        if (this.jsonSql && this.jsonSql.select) {
            let column;
            for (let i = 0, { length } = this.jsonSql.select; i < length; i += 1) {
                column = this.jsonSql.select[i];
                if (column.alias && column.value !== '*' && data[column.value] && column.alias !== column.value) {
                    data[column.alias] = data[column.value];
                    delete data[column.value];
                } else if (column.type === 'function' && getNameColumnFunction(column) && data[getNameColumnFunction(column)]) {
                    const name = getNameColumnFunction(column);
                    data[column.alias] = data[name];
                    if (column.alias !== name) {
                        delete data[name];
                    }
                }
            }
        }
        if (this.download && this.downloadType === 'csv') {
            return `${json2csv({
                data,
                hasCSVColumnTitle: this.first
            })}\n`;
        }
        return `${!this.first ? ',' : ''}${JSON.stringify(data)}`;
    }

    async writeRequest(request) {
        let count = 0;
        return new Promise((resolve, reject) => {
            let parser = null;
            if (this.sql.indexOf('returnCountOnly') >= 0) {
                parser = JSONStream.parse('count');
            } else if (this.downloadType === 'geojson') {
                parser = JSONStream.parse('features');
            } else {
                parser = JSONStream.parse('features.*.attributes');
            }
            request.on('error', err => reject(err));
            request.pipe(parser)
                .on('data', (data) => {
                    count += 1;
                    if (this.downloadType === 'geojson') {
                        data = data.map(arcgis.parse);
                    }
                    this.passthrough.write(this.convertObject(data));
                    this.first = false;
                })
                .on('header', (header) => {
                    if ('error' in header) {
                        reject(new Error(header.error.message));
                    }
                })
                .on('end', () => resolve(count))
                .on('error', (err) => {
                    logger.error(err);
                    reject(err);
                });
        });
    }

    async execute() {
        logger.info('Executing query');
        this.first = true;
        if (!this.download) {
            this.passthrough.write(`{"data":[`);
            if (this.downloadType === 'geojson') {
                this.passthrough.write(`{"type": "FeatureCollection", "features": `);
            }
        } else if (this.download) {
            if (this.downloadType === 'geojson') {
                this.passthrough.write(`{"data":[{"type": "FeatureCollection", "features": `);
            } else if (this.downloadType !== 'csv') {
                this.passthrough.write(`[`);
            }
        }

        const requestURL = ArcgisService.buildQueryUrl(this.dataset.connectorUrl, this.sql);
        const request = ArcgisService.executeQuery(requestURL);
        try {
            await this.writeRequest(request);
        } catch (err) {
            logger.error(`Error in request to ArcGIS server: ${err}`);
            throw new ArcgisServerError(`Error in request to ArcGIS server: ${err.message}`, requestURL);
        }

        const meta = {
            cloneUrl: this.cloneUrl
        };

        if (!this.download) {
            if (this.downloadType === 'geojson') {
                this.passthrough.write(`}`);
            }
            this.passthrough.write(`], "meta": ${JSON.stringify(meta)} }`);
        } else if (this.download) {
            if (this.downloadType === 'geojson') {
                this.passthrough.write(`}]}`);
            } else if (this.downloadType !== 'csv') {
                this.passthrough.write(`]`);
            }
        }
        logger.debug('Finished');
        this.passthrough.end();
    }


}

module.exports = QueryService;
