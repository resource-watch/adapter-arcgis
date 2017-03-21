const logger = require('logger');
const ArcgisService = require('services/arcgis.service');
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
            let stream = null;
            if (this.sql.indexOf('returnCountOnly') >= 0) {
                stream = request.pipe(JSONStream.parse('count'))
                    .on('data', data => {
                        this.passthrough.write(this.convertObject({ count: data }));
                    });
            } else {
                stream = request.pipe(JSONStream.parse('features.*.attributes'))
                    .on('data', (data) => {
                        count++;
                        this.passthrough.write(this.convertObject(data));
                        this.first = false;
                    });
            }
            stream
                .on('end', () => resolve(count))
                .on('error', () => reject('Error in stream'));
        });
    }

    async execute() {
        logger.info('Executing query');
        this.first = true;
        if (!this.download) {
            this.passthrough.write(`{"data":[`);
        } else if (this.download && this.downloadType !== 'csv') {
            this.passthrough.write(`[`);
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
            this.passthrough.write(`], "meta": ${JSON.stringify(meta)} }`);
        } else if (this.downloadType !== 'csv') {
            this.passthrough.write(`]`);
        }
        logger.debug('Finished');
        this.passthrough.end();
    }


}

module.exports = QueryService;
