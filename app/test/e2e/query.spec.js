/* eslint-disable no-unused-vars,no-undef,max-len */
const nock = require('nock');
const chai = require('chai');
const fs = require('fs');
const path = require('path');

chai.should();

const { getTestServer } = require('./utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('Query tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();
    });

    it('Query a dataset with "SELECT *" returns data', async () => {

        const query = 'SELECT * FROM coddonnees_ouvertes_enMapServer31';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryTestResponse.json'), 'utf8'));

        nock(process.env.CT_URL)
            .get('/v1/convert/sql2FS')
            .query({
                sql: query
            })
            .reply(200, {
                data: {
                    type: 'result',
                    id: 'undefined',
                    attributes: {
                        query: '?outFields=*&tableName=coddonnees_ouvertes_enMapServer31&where=1=1',
                        fs: {
                            tableName: 'coddonnees_ouvertes_enMapServer31',
                            outFields: '*',
                            where: '1=1'
                        },
                        jsonSql: {
                            select: [
                                {
                                    value: '*',
                                    alias: null,
                                    type: 'wildcard'
                                }
                            ],
                            from: 'coddonnees_ouvertes_enMapServer31'
                        }
                    },
                    relationships: {}
                }
            });

        nock('https://gis.forest-atlas.org')
            .get('/server/rest/services/cod/donnees_ouvertes_en/MapServer/31/query')
            .query({
                tableName: 'coddonnees_ouvertes_enMapServer31',
                outFields: '*',
                where: '1=1',
                f: 'json'
            })
            .reply(200, featureServiceResponseFullQuery);

        const dataset = {
            name: `Arcgis Dataset`,
            application: ['rw'],
            connectorType: 'rest',
            provider: 'cartodb',
            env: 'production',
            connectorUrl: 'https://gis.forest-atlas.org/server/rest/services/cod/donnees_ouvertes_en/MapServer/31?f=pjson',
            overwrite: true
        };

        const response = await requester
            .post(`/api/v1/arcgis/query/db8b2fae-3f3e-48e8-a4a6-996d51edf3f3?sql=${query}`)
            .send({
                dataset
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.should.have.property('meta').and.be.an('object');

        const responseContent = response.body.data[0];

        Object.keys(responseContent).should.deep.equal(Object.keys(featureServiceResponseFullQuery.fieldAliases));
    });

    it('Query a dataset with min() and max() calls returns data', async () => {

        const query = 'SELECT min(shape_Length) AS min, max(shape_Length) AS max FROM coddonnees_ouvertes_enMapServer31';

        nock(process.env.CT_URL)
            .get('/v1/convert/sql2FS')
            .query({ sql: query })
            .reply(200, {
                data: {
                    type: 'result',
                    id: 'undefined',
                    attributes: {
                        query: '?outStatistics=[{"statisticType":"min","onStatisticField":"shape_Length","outStatisticFieldName":"min"},{"statisticType":"max","onStatisticField":"shape_Length","outStatisticFieldName":"max"}]&tableName=coddonnees_ouvertes_enMapServer31&where=1=1',
                        fs: {
                            outStatistics: '[{"statisticType":"min","onStatisticField":"shape_Length","outStatisticFieldName":"min"},{"statisticType":"max","onStatisticField":"shape_Length","outStatisticFieldName":"max"}]',
                            tableName: 'coddonnees_ouvertes_enMapServer31',
                            where: '1=1'
                        },
                        jsonSql: {
                            select: [
                                {
                                    type: 'function',
                                    alias: 'min',
                                    value: 'min',
                                    arguments: [
                                        {
                                            value: 'shape_Length',
                                            type: 'literal'
                                        }
                                    ]
                                },
                                {
                                    type: 'function',
                                    alias: 'max',
                                    value: 'max',
                                    arguments: [
                                        {
                                            value: 'shape_Length',
                                            type: 'literal'
                                        }
                                    ]
                                }
                            ],
                            from: 'coddonnees_ouvertes_enMapServer31'
                        }
                    },
                    relationships: {}
                }
            });

        nock('https://gis.forest-atlas.org')
            .get('/server/rest/services/cod/donnees_ouvertes_en/MapServer/31/query')
            .query({
                outStatistics: '[{"statisticType":"min","onStatisticField":"shape_Length","outStatisticFieldName":"min"},{"statisticType":"max","onStatisticField":"shape_Length","outStatisticFieldName":"max"}]',
                tableName: 'coddonnees_ouvertes_enMapServer31',
                where: '1=1',
                f: 'json'
            })
            .reply(200, {
                displayFieldName: '',
                fieldAliases: {
                    min: 'min',
                    max: 'max'
                },
                fields: [
                    {
                        name: 'min',
                        type: 'esriFieldTypeDouble',
                        alias: 'min'
                    },
                    {
                        name: 'max',
                        type: 'esriFieldTypeDouble',
                        alias: 'max'
                    }
                ],
                features: [
                    {
                        attributes: {
                            min: 70263.67728178609,
                            max: 475966.99578403885
                        }
                    }
                ]
            });

        const dataset = {
            name: `Arcgis Dataset`,
            application: ['rw'],
            connectorType: 'rest',
            provider: 'cartodb',
            env: 'production',
            connectorUrl: 'https://gis.forest-atlas.org/server/rest/services/cod/donnees_ouvertes_en/MapServer/31?f=pjson',
            overwrite: true
        };

        const response = await requester
            .post(`/api/v1/arcgis/query/db8b2fae-3f3e-48e8-a4a6-996d51edf3f3?sql=${query}`)
            .send({
                dataset,
                // loggedUser: ROLES.ADMIN
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.should.have.property('meta').and.be.an('object');

        const responseContent = response.body.data[0];

        responseContent.should.have.property('min').and.equal(70263.67728178609);
        responseContent.should.have.property('max').and.equal(475966.99578403885);
    });

    it('Query a dataset with "WHERE LIKE \'%%\'" calls returns data', async () => {

        const query = 'SELECT tcl_name as x, area_ha as y FROM conservationMapServer3 WHERE tcl_name LIKE \'%ba%\'  ORDER BY area_ha desc LIMIT 50';

        nock(process.env.CT_URL)
            .get('/v1/convert/sql2FS')
            .query({ sql: query })
            .reply(200, {
                data: {
                    type: 'result',
                    id: 'undefined',
                    attributes: {
                        query: '?outFields=tcl_name,area_ha&tableName=conservationMapServer3&where=tcl_name LIKE \'%ba%\'&orderByFields=area_ha&resultRecordCount=50&supportsPagination=true',
                        fs: {
                            tableName: 'conservationMapServer3',
                            outFields: 'tcl_name,area_ha',
                            orderByFields: 'area_ha',
                            resultRecordCount: 50,
                            supportsPagination: true,
                            where: 'tcl_name LIKE \'%ba%\''
                        },
                        jsonSql: {
                            select: [{
                                value: 'tcl_name',
                                alias: 'x',
                                type: 'literal'
                            }, { value: 'area_ha', alias: 'y', type: 'literal' }],
                            from: 'conservationMapServer3',
                            where: {
                                type: 'operator',
                                value: 'LIKE',
                                left: { value: 'tcl_name', type: 'literal' },
                                right: { value: '%ba%', type: 'string' }
                            },
                            orderBy: [{
                                value: 'area_ha', type: 'literal', alias: null, direction: 'desc'
                            }],
                            limit: 50
                        }
                    },
                    relationships: {}
                }
            });

        nock('https://gis-gfw.wri.org')
            .get('/arcgis/rest/services/conservation/MapServer/3/query')
            .query(
                {
                    tableName: 'conservationMapServer3',
                    outFields: 'tcl_name,area_ha',
                    orderByFields: 'area_ha',
                    resultRecordCount: '50',
                    supportsPagination: 'true',
                    where: 'tcl_name LIKE \'%ba%\'',
                    f: 'json'
                }
            )
            .reply(200, {
                displayFieldName: 'tcl_name',
                fieldAliases: { tcl_name: 'Landscape Name', area_ha: 'Area (ha)' },
                geometryType: 'esriGeometryPolygon',
                spatialReference: { wkid: 102100, latestWkid: 3857 },
                fields: [{
                    name: 'tcl_name',
                    type: 'esriFieldTypeString',
                    alias: 'Landscape Name',
                    length: 48
                }, { name: 'area_ha', type: 'esriFieldTypeInteger', alias: 'Area (ha)' }],
                features: [{
                    attributes: { tcl_name: 'Mahabaleshwar Landscape - South', area_ha: 34400 },
                    geometry: {}
                }, {
                    attributes: { tcl_name: 'Mahabaleshwar Landscape - North', area_ha: 40600 },
                    geometry: {}
                }, {
                    attributes: { tcl_name: 'Berbak', area_ha: 254300 },
                    geometry: {}
                }, {
                    attributes: { tcl_name: 'Andhari - Tadoba', area_ha: 368000 },
                    geometry: {}
                }, {
                    attributes: { tcl_name: 'Bukit Rimbang Baling', area_ha: 439500 },
                    geometry: {}
                }, {
                    attributes: { tcl_name: 'Sundarbans', area_ha: 530400 },
                    geometry: {}
                }]
            });

        const dataset = {
            name: `Arcgis Dataset`,
            application: ['rw'],
            connectorType: 'rest',
            provider: 'cartodb',
            env: 'production',
            connectorUrl: 'http://gis-gfw.wri.org/arcgis/rest/services/conservation/MapServer/3?f=pjson',
            overwrite: true
        };

        const response = await requester
            .post(`/api/v1/arcgis/query/db8b2fae-3f3e-48e8-a4a6-996d51edf3f3?sql=${encodeURI(query)}`)
            .send({
                dataset
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.lengthOf(6);
        response.body.should.have.property('meta').and.be.an('object');

        const responseContent = response.body.data;

        responseContent[0].should.have.property('x').and.equal('Mahabaleshwar Landscape - South');
        responseContent[0].should.have.property('y').and.equal(34400);

        responseContent[1].should.have.property('x').and.equal('Mahabaleshwar Landscape - North');
        responseContent[1].should.have.property('y').and.equal(40600);

        responseContent[2].should.have.property('x').and.equal('Berbak');
        responseContent[2].should.have.property('y').and.equal(254300);

        responseContent[3].should.have.property('x').and.equal('Andhari - Tadoba');
        responseContent[3].should.have.property('y').and.equal(368000);

        responseContent[4].should.have.property('x').and.equal('Bukit Rimbang Baling');
        responseContent[4].should.have.property('y').and.equal(439500);

        responseContent[5].should.have.property('x').and.equal('Sundarbans');
        responseContent[5].should.have.property('y').and.equal(530400);
    });

    it('Unsupported ArcGIS queries return an error', async () => {

        const query = 'SELECT DISTINCT FUNCSTAT10 FROM ea852c8e-4dca-493c-8de2-e2d84d02897f LIMIT 10';

        nock(process.env.CT_URL)
            .get('/v1/convert/sql2FS')
            .query({ sql: query })
            .reply(200, {
                data: {
                    type: 'result',
                    id: 'undefined',
                    attributes: {
                        query: '?returnDistinctValues=true&returnGeometry=false&outFields=FUNCSTAT10&tableName=ea852c8e-4dca-493c-8de2-e2d84d02897f&where=1=1&resultRecordCount=10&supportsPagination=true',
                        fs: {
                            returnGeometry: false,
                            returnDistinctValues: true,
                            tableName: 'ea852c8e-4dca-493c-8de2-e2d84d02897f',
                            outFields: 'FUNCSTAT10',
                            resultRecordCount: 10,
                            supportsPagination: true,
                            where: '1=1'
                        },
                        jsonSql: {
                            select: [{
                                type: 'distinct',
                                arguments: [{ value: 'FUNCSTAT10', alias: null, type: 'literal' }]
                            }],
                            from: 'ea852c8e-4dca-493c-8de2-e2d84d02897f',
                            limit: 10
                        }
                    },
                    relationships: {}
                }
            });


        nock('https://coast.noaa.gov')
            .get('/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/8/query')
            .query({
                returnGeometry: 'false',
                returnDistinctValues: 'true',
                tableName: 'ea852c8e-4dca-493c-8de2-e2d84d02897f',
                outFields: 'FUNCSTAT10',
                resultRecordCount: '10',
                supportsPagination: 'true',
                where: '1=1',
                f: 'json'
            })
            .reply(200, { error: { code: 400, message: 'Failed to execute query.', details: [] } });


        const dataset = {
            name: `Arcgis Dataset`,
            application: ['rw'],
            connectorType: 'rest',
            provider: 'featureservice',
            env: 'production',
            connectorUrl: 'https://coast.noaa.gov/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/8?f=pjson',
            overwrite: true
        };

        const response = await requester
            .post(`/api/v1/arcgis/query/db8b2fae-3f3e-48e8-a4a6-996d51edf3f3?sql=${encodeURI(query)}`)
            .send({
                dataset
            });

        response.status.should.equal(500);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Error in request to ArcGIS server: Failed to execute query.`);
        response.body.errors[0].should.have.property('requestURL').and.equal(`https://coast.noaa.gov/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/8/query?returnGeometry=false&returnDistinctValues=true&tableName=ea852c8e-4dca-493c-8de2-e2d84d02897f&outFields=FUNCSTAT10&resultRecordCount=10&supportsPagination=true&where=1%3D1&f=json`);
    });


    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
