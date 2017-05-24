const logger = require('logger');
const ArcgisService = require('services/arcgis.service');
const arcgis = require('terraformer-arcgis-parser');
const JSONStream = require('JSONStream');
const json2csv = require('json2csv');

class QueryService {

    constructor(sql, dataset, passthrough, cloneUrl, download, downloadType) {
        this.sql = sql;
        this.dataset = dataset;
        this.passthrough = passthrough;
        this.cloneUrl = cloneUrl;
        this.download = download;
        this.downloadType = downloadType;
        this.timeout = false;
        this.timeoutFunc = setTimeout(() => { this.timeout = true; }, 60000);
    }

    convertObject(data) {
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
            } else {
                if (this.downloadType === 'geojson') {
                    parser = JSONStream.parse('features');
                } else {
                    parser = JSONStream.parse('features.*.attributes');
                }
            }
            request.pipe(parser)
                .on('data', (data) => {
                    count++;
                    if (this.downloadType === 'geojson') {
                        data = data.map(arcgis.parse);
                    }
                    this.passthrough.write(this.convertObject(data));
                    this.first = false;
                })
                .on('end', () => resolve(count))
                .on('error', () => reject('Error in stream'));
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

        const request = ArcgisService.executeQuery(this.dataset.connectorUrl, this.sql);
        await this.writeRequest(request);

        if (this.timeout) {
            this.passthrough.end();
            throw new Error('Timeout exceeded');
        }
        clearTimeout(this.timeoutFunc);
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
