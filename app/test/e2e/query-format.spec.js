/* eslint-disable no-undef,max-len */
const nock = require('nock');
const chai = require('chai');
const fs = require('fs');
const path = require('path');

chai.should();

const { getTestServer } = require('./utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('Query with different response formats tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();
    });

    it('Query a dataset with no format uses json format by default', async () => {

        const query = 'SELECT Category_EN, PA_Area_ha_KA FROM atlasprotected_areasMapServer4 LIMIT 20';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryFormatTestResponse.json'), 'utf8'));

        nock(process.env.CT_URL)
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

        nock('https://gis.mepa.gov.ge')
            .get('/server/rest/services/atlas/protected_areas/MapServer/4/query')
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

        const dataset = {
            name: `Arcgis Dataset`,
            application: ['rw'],
            connectorType: 'rest',
            provider: 'featureservice',
            env: 'production',
            connectorUrl: 'https://gis.mepa.gov.ge/server/rest/services/atlas/protected_areas/MapServer/4?f=pjson',
            overwrite: true
        };

        const response = await requester
            .post(`/api/v1/arcgis/query/db8b2fae-3f3e-48e8-a4a6-996d51edf3f3`)
            .query({
                sql: query
            })
            .send({
                dataset
            });

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

        const query = 'SELECT Category_EN, PA_Area_ha_KA FROM atlasprotected_areasMapServer4 LIMIT 20';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryFormatTestResponse.json'), 'utf8'));

        nock(process.env.CT_URL)
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

        nock('https://gis.mepa.gov.ge')
            .get('/server/rest/services/atlas/protected_areas/MapServer/4/query')
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

        const dataset = {
            name: `Arcgis Dataset`,
            application: ['rw'],
            connectorType: 'rest',
            provider: 'featureservice',
            env: 'production',
            connectorUrl: 'https://gis.mepa.gov.ge/server/rest/services/atlas/protected_areas/MapServer/4?f=pjson',
            overwrite: true
        };

        const response = await requester
            .post(`/api/v1/arcgis/query/db8b2fae-3f3e-48e8-a4a6-996d51edf3f3`)
            .query({
                sql: query,
                format: 'json'
            })
            .send({
                dataset
            });

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

        const query = 'SELECT Category_EN, PA_Area_ha_KA FROM atlasprotected_areasMapServer4 LIMIT 20';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryFormatTestResponse.json'), 'utf8'));

        nock(process.env.CT_URL)
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

        nock('https://gis.mepa.gov.ge')
            .get('/server/rest/services/atlas/protected_areas/MapServer/4/query')
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

        const dataset = {
            name: `Arcgis Dataset`,
            application: ['rw'],
            connectorType: 'rest',
            provider: 'featureservice',
            env: 'production',
            connectorUrl: 'https://gis.mepa.gov.ge/server/rest/services/atlas/protected_areas/MapServer/4?f=pjson',
            overwrite: true
        };

        const response = await requester
            .post(`/api/v1/arcgis/query/db8b2fae-3f3e-48e8-a4a6-996d51edf3f3`)
            .query({
                sql: query,
                format: 'geojson'
            })
            .send({
                dataset
            });

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
