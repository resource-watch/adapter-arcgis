const logger = require('logger');
const url = require('url');
const request = require('request');
const requestPromise = require('request-promise');

class ArcgisService {

    static async getFields(urlDataset, tableName) {
        logger.debug(`Obtaining fields of ${url} and table ${tableName}`);
        const parsedUrl = url.parse(urlDataset);
        logger.debug('Doing request to ', `https://${parsedUrl.host}/api/v2/sql?q=select * from ${tableName} limit 0`);
        try {
            const result = await requestPromise({
                method: 'GET',
                uri: `https://${parsedUrl.host}/api/v2/sql?q=select * from ${tableName} limit 0`,
                json: true
            });
            return result.fields;
        } catch (err) {
            logger.error('Error obtaining fields', err);
            throw new Error('Error obtaining fields');
        }
    }

    static async getCount(urlDataset, tableName, where) {
        logger.debug(`Obtaining count of ${urlDataset} and table ${tableName}`);
        const parsedUrl = url.parse(urlDataset);
        logger.debug('Doing request to ', unescape(`https://${parsedUrl.host}/api/v2/sql?q=select count(*) from ${tableName} ${where ? `where ${where.expression}` : ''}`));
        try {
            const result = await requestPromise({
                method: 'POST',
                uri: `https://${parsedUrl.host}/api/v2/sql`,
                json: true,
                body: {
                    q: unescape(`select count(*) from ${tableName} ${where ? `where ${where.expression}` : ''}`)
                }
            });
            return result.rows[0].count;
        } catch (err) {
            logger.error('Error obtaining count', err.message);
            throw err;
        }
    }

    static executeQuery(urlDataset, query) {
        logger.debug(`Doing query ${query} to ${urlDataset}`);
        const parsedUrl = url.parse(urlDataset);
        logger.debug('Doing request to ', `https://${parsedUrl.host}/api/v2/sql?q=...`);
        return request({
            uri: `https://${parsedUrl.host}/api/v2/sql`,
            method: 'POST',
            json: true,
            body: {
                q: unescape(query)
            }
        });
    }

}

module.exports = ArcgisService;
