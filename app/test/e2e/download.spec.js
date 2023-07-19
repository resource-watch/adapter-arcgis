/* eslint-disable max-len */
const nock = require('nock');
const chai = require('chai');
const fs = require('fs');
const path = require('path');
const { getTestServer } = require('./utils/test-server');
const { ensureCorrectError, createMockGetDataset, mockValidateRequestWithApiKey } = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Query download tests', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Download from a dataset without connectorType document should fail', async () => {
        mockValidateRequestWithApiKey({});
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { connectorType: 'foo' });

        const requestBody = {};

        const query = `select * from ${timestamp}`;

        const response = await requester
            .post(`/api/v1/arcgis/download/${timestamp}?sql=${encodeURI(query)}`)
            .set('x-api-key', 'api-key-test')
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Download from a without a supported provider should fail', async () => {
        mockValidateRequestWithApiKey({});
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { provider: 'foo' });

        const requestBody = {};

        const query = `select * from ${timestamp}`;

        const response = await requester
            .post(`/api/v1/arcgis/download/${timestamp}?sql=${encodeURI(query)}`)
            .set('x-api-key', 'api-key-test')
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'featureservice\'');
    });

    it('Query without sql or fs parameter should return bad request', async () => {
        mockValidateRequestWithApiKey({});
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp);

        const response = await requester
            .post(`/api/v1/arcgis/download/${timestamp}`)
            .set('x-api-key', 'api-key-test')
            .send();

        ensureCorrectError(response, 'sql or fs required', 400);
    });

    it('Send query should return result with format json (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const timestamp = new Date().getTime();

        const sql = 'SELECT * FROM test LIMIT 2 OFFSET 0';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryTestResponse.json'), 'utf8'));

        createMockGetDataset(timestamp);

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get('/v1/convert/sql2FS')
            .query({
                sql,
                excludeGeometries: true
            })
            .reply(200, {
                data: {
                    type: 'result',
                    id: 'undefined',
                    attributes: {
                        query: '?outFields=*&tableName=coddonnees_ouvertes_enMapServer31&where=1=1&returnGeometry=false',
                        fs: {
                            tableName: 'coddonnees_ouvertes_enMapServer31',
                            outFields: '*',
                            where: '1=1',
                            returnGeometry: false
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

        nock('https://coast.noaa.gov')
            .get('/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/16/query')
            .query({
                tableName: 'coddonnees_ouvertes_enMapServer31',
                outFields: '*',
                where: '1=1',
                f: 'json',
                returnGeometry: false
            })
            .reply(200, featureServiceResponseFullQuery);

        const response = await requester
            .post(`/api/v1/arcgis/download/${timestamp}`)
            .query({ sql, format: 'json' })
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.headers['content-type'].should.equal('application/json');
        response.headers['content-disposition'].should.equal(`attachment; filename=${timestamp}.json`);

        response.body.should.deep.equal(featureServiceResponseFullQuery.features.map((e) => e.attributes));
    });

    it('Send query should return result with format csv (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const timestamp = new Date().getTime();

        const sql = 'SELECT * FROM test LIMIT 2 OFFSET 0';
        const featureServiceResponseFullQuery = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'assets/queryTestResponse.json'), 'utf8'));

        createMockGetDataset(timestamp);

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get('/v1/convert/sql2FS')
            .query({
                sql,
                excludeGeometries: true
            })
            .reply(200, {
                data: {
                    type: 'result',
                    id: 'undefined',
                    attributes: {
                        query: '?outFields=*&tableName=coddonnees_ouvertes_enMapServer31&where=1=1&returnGeometry=false',
                        fs: {
                            tableName: 'coddonnees_ouvertes_enMapServer31',
                            outFields: '*',
                            where: '1=1',
                            returnGeometry: false
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

        nock('https://coast.noaa.gov')
            .get('/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/16/query')
            .query({
                tableName: 'coddonnees_ouvertes_enMapServer31',
                outFields: '*',
                where: '1=1',
                f: 'json',
                returnGeometry: false
            })
            .reply(200, featureServiceResponseFullQuery);

        const response = await requester
            .post(`/api/v1/arcgis/download/${timestamp}`)
            .set('x-api-key', 'api-key-test')
            .query({ sql, format: 'csv' })
            .send();

        response.status.should.equal(200);
        response.headers['content-type'].should.equal('text/csv');
        response.headers['content-disposition'].should.equal(`attachment; filename=${timestamp}.csv`);

        response.text.should.equal('"objectid","type_","desc_type","num_ccf","num_ga","statu_ccf","ref_ccf","date_attr","date_echea","attributai","orig_capit","statu_pg","statu_amgt","date_amgt","statu_cert","type_cert","date_cert","dat_ech_ce","statu_leg","date_legal","dat_ech_le","sup_adm_ha","sup_ccf_ha","sup_exp_ha","sup_sig_ha","created_user","created_date","last_edited_user","last_edited_date","globalid","ancien_nom","shape_Length","shape_Area"\n'
            + '1,4110100,"Contrat concession forestière","028/11","027/04","resilie","028/11 du 24 octobre 2011","24/10/2011",2108332800000,"SIFORCO","Suisse/Danzer","valide",,,,,,,,,,181980,221176,,221176,"USER",1433955984000,"RMAMBETA",1448973895000,"{8C1C42A5-865D-4512-AA01-E48B059DA0A5}",,266147.8261364685,2211763317.6076174\n'
            + '2,4110100,"Contrat concession forestière","056/14","046/04","signe","061/14 du 02 juillet 2014","02/07/2014",2193091200000,"RIBA CONGO","Portugais/Ribadao","valide",,,,,,,,,,48256,37367,,37367,"USER",1433955984000,"RMAMBETA",1448985272000,"{06F1483C-C933-44D7-B044-A8D1E5E265CD}",,110948.30116878389,373668416.0103432\n'
            + '3,4110100,"Contrat concession forestière","002/11","003/92","signe","002/11 du 04 août 2011","04/08/2011",2101334400000,"LA FORESTIERE","Italien/Feretti","valide",,,,,,,,,,140224,140224,,147447,"USER",1433955984000,"RMAMBETA",1448973918000,"{59FBE009-89F8-4DB4-B119-48D4C4F94CA1}",,203560.92452397544,1474473809.510397\n'
            + '4,4110100,"Contrat concession forestière","019/11","006/92","signe","019/11 du 24 octobre 2011","24/10/2011",2108332800000,"ENRA","Congolais","valide",,,,,,,,,,52192,60182,,60182,"USER",1433955984000,"RMAMBETA",1448973918000,"{968B8C89-4701-464A-9DE7-5E8EA6A25D8A}",,134934.25975962484,601816595.3135114\n'
            + '5,4110100,"Contrat concession forestière","059/14","015/03","signe","059/14 du 10 juillet 2014","10/07/2014",2196460800000,"SODEFOR","Suisse/Nordsud Timber","valide",,,,,,,,,,200000,288404,,288413,"USER",1433955984000,"RMAMBETA",1448985272000,"{90CC7A1E-38BE-43D2-8CF3-69121B962999}","CFT",290838.2882260975,2884127059.290899\n'
            + '6,4110100,"Contrat concession forestière","001/16"," ","signe"," "," ",,"CFE"," ","non_elabore",,,,,,,,,,127300,85984,,125940,"USER",1433955984000,"RMAMBETA",1448973895000,"{E10D5310-6EBF-411D-9EF6-C60A20D4668B}","SICOBOIS, 014/11",193864.13927347973,1259397352.0965912\n'
            + '7,4110100,"Contrat concession forestière","057/14","007/03","signe","057/14 du 10 juillet 2014","10/07/2014",2196460800000,,"Suisse/Nordsud Timber","valide",,,,,,,,,,60000,107421,,109334,"USER",1433955984000,"RMAMBETA",1448985272000,"{A6C6AD71-94C2-4128-B43C-2C85DAE29438}","SOFORMA",170119.64457216492,1093338141.1662073\n'
            + '8,4110100,"Contrat concession forestière","001/15","033/03","signe","001/15 du 16 août 2015","16/08/2015",2228774400000,"SOMIFOR","Chinoise"," ",,,,,,,,,,115000,201564,,201564,"USER",1433955984000,"RMAMBETA",1448973895000,"{D4693799-2DB4-4A62-9A74-9844884E45A6}","Soforma/retrocédé/réattribué/annulé/réhabilité",319896.09102375427,2015644423.901367\n'
            + '9,4110100,"Contrat concession forestière","061/14","019/03","signe","061/14 du 10 juillet 2014","10/07/2014",2196460800000,"SODEFOR","Suisse + Etat Congolais/Nordsud Timber","valide",,,,,,,,,,38000,239858,,246411,"USER",1433955984000,"RMAMBETA",1448985272000,"{872688B3-50BD-4D8C-B9E4-E07AE8FAA41C}",,272209.9004338493,2464105312.433989\n'
            + '10,4110100,"Contrat concession forestière","029/11","002/89","resilie","029/11 du 24 octobre 2011","24/10/2011",2108332800000,"SIFORCO","Suisse/Danzer"," ",,,,,,,,,,293000,0,,299919,"USER",1433955984000,"RMAMBETA",1448973895000,"{883DA2CD-F62E-4175-A946-0A1740961781}",,227534.34306272256,2999187501.800418\n');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
