/* eslint-disable max-len */
const nock = require('nock');
const chai = require('chai');
const fs = require('fs');
const path = require('path');
const { getTestServer } = require('./utils/test-server');
const { createMockGetDataset, mockValidateRequestWithApiKey } = require('./utils/helpers');

chai.should();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('Query with different response formats tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Query to dataset without connectorType document should fail', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId, { connectorType: 'foo' });

        const requestBody = {};

        const query = `select * from ${datasetId}`;

        const queryResponse = await requester
            .get(`/api/v1/arcgis/query/${datasetId}?sql=${encodeURI(query)}`)
            .set('x-api-key', 'api-key-test')
            .send(requestBody);

        queryResponse.status.should.equal(422);
        queryResponse.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        queryResponse.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Query to dataset without a supported provider should fail', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId, { provider: 'foo' });

        const requestBody = {};

        const query = `select * from ${datasetId}`;

        const queryResponse = await requester
            .get(`/api/v1/arcgis/query/${datasetId}?sql=${encodeURI(query)}`)
            .set('x-api-key', 'api-key-test')
            .send(requestBody);

        queryResponse.status.should.equal(422);
        queryResponse.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        queryResponse.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'featureservice\'');
    });

    it('Query a dataset with no format uses json format by default', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId);

        const query = 'SELECT Category_EN, PA_Area_ha_KA FROM atlasprotected_areasMapServer4 LIMIT 20';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryFormatTestResponse.json'), 'utf8'));

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get('/v1/convert/sql2FS')
            .query({
                sql: query,
                excludeGeometries: true
            })
            .reply(200, {
                data: {
                    type: 'result',
                    attributes: {
                        query: '?outFields=Category_EN,PA_Area_ha_KA&tableName=atlasprotected_areasMapServer4&where=1=1&resultRecordCount=20&supportsPagination=true&returnGeometry=false',
                        fs: {
                            tableName: 'atlasprotected_areasMapServer4',
                            outFields: 'Category_EN,PA_Area_ha_KA',
                            resultRecordCount: 20,
                            supportsPagination: true,
                            where: '1=1',
                            returnGeometry: false
                        },
                        jsonSql: {
                            select: [{
                                value: 'Category_EN',
                                alias: null,
                                type: 'literal'
                            }, { value: 'PA_Area_ha_KA', alias: null, type: 'literal' }],
                            from: 'atlasprotected_areasMapServer4',
                            limit: 20
                        }
                    }
                }
            });

        nock('https://coast.noaa.gov')
            .get('/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/16/query')
            .query({
                tableName: 'atlasprotected_areasMapServer4',
                outFields: 'Category_EN,PA_Area_ha_KA',
                resultRecordCount: '20',
                supportsPagination: 'true',
                where: '1=1',
                f: 'json',
                returnGeometry: false
            })
            .reply(200, featureServiceResponseFullQuery);

        const response = await requester
            .get(`/api/v1/arcgis/query/${datasetId}`)
            .set('x-api-key', 'api-key-test')
            .query({
                sql: query
            })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(20);
        response.body.data.forEach((elem) => {
            elem.should.have.property('Category_EN').and.be.a('string');
            elem.should.have.property('PA_Area_ha_KA').and.be.a('number');
        });
        response.body.should.have.property('meta').and.be.an('object');

        const responseContent = response.body.data[0];

        Object.keys(responseContent).should.deep.equal(Object.keys(featureServiceResponseFullQuery.fieldAliases));
    });

    it('Query a dataset with explicit json format returns the queried field values', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId);

        const query = 'SELECT Category_EN, PA_Area_ha_KA FROM atlasprotected_areasMapServer4 LIMIT 20';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryFormatTestResponse.json'), 'utf8'));

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get('/v1/convert/sql2FS')
            .query({
                sql: query,
                excludeGeometries: true
            })
            .reply(200, {
                data: {
                    type: 'result',
                    attributes: {
                        query: '?outFields=Category_EN,PA_Area_ha_KA&tableName=atlasprotected_areasMapServer4&where=1=1&resultRecordCount=20&supportsPagination=true&returnGeometry=false',
                        fs: {
                            tableName: 'atlasprotected_areasMapServer4',
                            outFields: 'Category_EN,PA_Area_ha_KA',
                            resultRecordCount: 20,
                            supportsPagination: true,
                            where: '1=1',
                            returnGeometry: false
                        },
                        jsonSql: {
                            select: [{
                                value: 'Category_EN',
                                alias: null,
                                type: 'literal'
                            }, { value: 'PA_Area_ha_KA', alias: null, type: 'literal' }],
                            from: 'atlasprotected_areasMapServer4',
                            limit: 20
                        }
                    }
                }
            });

        nock('https://coast.noaa.gov')
            .get('/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/16/query')
            .query({
                tableName: 'atlasprotected_areasMapServer4',
                outFields: 'Category_EN,PA_Area_ha_KA',
                resultRecordCount: '20',
                supportsPagination: 'true',
                where: '1=1',
                f: 'json',
                returnGeometry: false
            })
            .reply(200, featureServiceResponseFullQuery);

        const response = await requester
            .get(`/api/v1/arcgis/query/${datasetId}`)
            .set('x-api-key', 'api-key-test')
            .query({
                sql: query,
                format: 'json'
            })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(20);
        response.body.data.forEach((elem) => {
            elem.should.have.property('Category_EN').and.be.a('string');
            elem.should.have.property('PA_Area_ha_KA').and.be.a('number');
        });
        response.body.should.have.property('meta').and.be.an('object');

        const responseContent = response.body.data[0];

        Object.keys(responseContent).should.deep.equal(Object.keys(featureServiceResponseFullQuery.fieldAliases));
    });

    it('Query a dataset with explicit geojson format returns the queried field values', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId);

        const query = 'SELECT Category_EN, PA_Area_ha_KA FROM atlasprotected_areasMapServer4 LIMIT 20';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryFormatTestResponse.json'), 'utf8'));

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get('/v1/convert/sql2FS')
            .query({
                sql: query
            })
            .reply(200, {
                data: {
                    type: 'result',
                    attributes: {
                        query: '?outFields=Category_EN,PA_Area_ha_KA&tableName=atlasprotected_areasMapServer4&where=1=1&resultRecordCount=20&supportsPagination=true&returnGeometry=true',
                        fs: {
                            tableName: 'atlasprotected_areasMapServer4',
                            outFields: 'Category_EN,PA_Area_ha_KA',
                            resultRecordCount: 20,
                            supportsPagination: true,
                            where: '1=1',
                            returnGeometry: true
                        },
                        jsonSql: {
                            select: [{
                                value: 'Category_EN',
                                alias: null,
                                type: 'literal'
                            }, { value: 'PA_Area_ha_KA', alias: null, type: 'literal' }],
                            from: 'atlasprotected_areasMapServer4',
                            limit: 20
                        }
                    }
                }
            });

        nock('https://coast.noaa.gov')
            .get('/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/16/query')
            .query({
                tableName: 'atlasprotected_areasMapServer4',
                outFields: 'Category_EN,PA_Area_ha_KA',
                resultRecordCount: '20',
                supportsPagination: 'true',
                where: '1=1',
                f: 'json',
                returnGeometry: true
            })
            .reply(200, featureServiceResponseFullQuery);

        const response = await requester
            .get(`/api/v1/arcgis/query/${datasetId}`)
            .set('x-api-key', 'api-key-test')
            .query({
                sql: query,
                format: 'geojson'
            })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.data[0].should.have.property('type').and.equal('FeatureCollection');

        response.body.data[0].features.forEach((elem) => {
            elem.should.have.property('type').and.equal('Feature');
            elem.should.have.property('geometry').and.be.an('object');
            elem.should.have.property('properties').and.be.an('object');

            elem.properties.should.have.property('Category_EN').and.be.a('string');
            elem.properties.should.have.property('PA_Area_ha_KA').and.be.a('number');

            elem.should.have.property('bbox').and.be.an('array').and.length(4);

        });
        response.body.should.have.property('meta').and.be.an('object');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
