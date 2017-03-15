const logger = require('logger');
const simpleSqlParser = require('simple-sql-parser');
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
        const ast = QueryService.obtainASTFromSQL(this.sql);
        if (ast.error) {
            throw new Error('Query not valid');
        }
        this.ast = ast.ast;
        this.pagination = 10;
        this.timeout = false;
        this.timeoutFunc = setTimeout(() => { this.timeout = true; }, 60000);
    }

    async init() {
        await this.getCount();
    }

    static obtainASTFromSQL(sql) {
        const ast = simpleSqlParser.sql2ast(sql);
        if (!ast.status) {
            return {
                error: true,
                ast: null
            };
        }
        return {
            error: false,
            ast: ast.value
        };
    }

    async getCount() {
        logger.debug('Obtaining count', this.ast);
        this.count = await ArcgisService.getCount(this.dataset.connectorUrl, this.ast.from[0].expression, this.ast.where);
        if (this.ast.limit && this.ast.limit.nb && this.count > this.ast.limit.nb) {
            this.count = this.ast.limit.nb;
        }
        if ((this.ast.limit && this.ast.limit.nb > this.pagination) || !this.ast.limit) {
            this.ast.limit = {
                nb: this.pagination,
                from: null
            };
        }
        logger.debug('limit ', this.ast.limit, ' count', this.count);
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
            request.pipe(JSONStream.parse('rows.*'))
                .on('data', (data) => {
                    count++;
                    this.passthrough.write(this.convertObject(data));
                    this.first = false;
                })
                .on('end', () => resolve(count))
                .on('error', () => reject('Error in stream'));
        });
    }

    async execute() {
        logger.info('Executing query');
        const pages = Math.ceil(this.count / this.pagination);
        this.first = true;
        if (!this.download) {
            this.passthrough.write(`{"data":[`);
        } else if (this.download && this.downloadType !== 'csv') {
            this.passthrough.write(`[`);
        }

        for (let i = 0; i < pages; i++) {
            if (this.timeout) {
                break;
            }
            logger.debug(`Obtaining page ${i}`);
            const offset = i * this.pagination;
            if (i + 1 === pages) {
                this.ast.limit = {
                    nb: this.count - (this.pagination * i),
                    from: null
                };
            }
            logger.debug('Query', `${simpleSqlParser.ast2sql({ status: true, value: this.ast })} OFFSET ${offset}`);
            const request = ArcgisService.executeQuery(this.dataset.connectorUrl, `${simpleSqlParser.ast2sql({ status: true, value: this.ast })} OFFSET ${offset}`);
            const count = await this.writeRequest(request);
            // if not return the same number of rows that pagination is that the query finished
            if (count < this.pagination) {
                break;
            }
        }

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
