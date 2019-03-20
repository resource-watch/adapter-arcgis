const logger = require('logger');
const request = require('request');
const requestPromise = require('request-promise');

class ArcgisService {

    static async getFields(urlDataset) {
        logger.debug(`Obtaining fields of ${urlDataset}`);
        const reqUrl = `${urlDataset.split('?')[0]}?f=json`.replace('http:', 'https:');
        logger.debug('Doing request to ', reqUrl);
        try {
            const result = await requestPromise({
                method: 'GET',
                uri: reqUrl,
                json: true
            });
            return result.fields;
        } catch (err) {
            logger.error('Error obtaining fields', err);
            throw new Error('Error obtaining fields');
        }
    }

    static buildQueryUrl(urlDataset, query) {
        return `${urlDataset.split('?')[0]}/query${query}&f=json`.replace('http:', 'https:');
    }

    static executeQuery(reqUrl) {
        logger.debug('Doing request to ', reqUrl);
        try {
            return request({
                method: 'GET',
                uri: reqUrl,
                json: true,
                timeout: 30000
            });
        } catch (err) {
            logger.error('Error doing query', err);
            throw new Error('Error doing query');
        }
    }

}

module.exports = ArcgisService;
