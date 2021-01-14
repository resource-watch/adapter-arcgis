const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createMockGetDataset } = require('./utils/helpers');

chai.should();

const requester = getTestServer();

describe('GET fields', () => {

    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Getting the fields for a dataset without connectorType document should fail', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { connectorType: 'foo' });

        const requestBody = {};

        const response = await requester
            .post(`/api/v1/arcgis/fields/${timestamp}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Getting the fields for a dataset without a supported provider should fail', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { provider: 'foo' });

        const requestBody = {};

        const response = await requester
            .post(`/api/v1/arcgis/fields/${timestamp}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'featureservice\'');
    });

    it('Get fields correctly for a arcgis dataset should return the field list (happy case)', async () => {
        const timestamp = new Date().getTime();

        const dataset = createMockGetDataset(timestamp);

        const fields = [
            {
                name: 'STATION_ID',
                type: 'esriFieldTypeString',
                alias: 'STATION_ID',
                length: 20,
                domain: null
            },
            {
                name: 'STATION_NAME',
                type: 'esriFieldTypeString',
                alias: 'STATION_NAME',
                length: 80,
                domain: null
            },
            {
                name: 'STATE',
                type: 'esriFieldTypeString',
                alias: 'STATE',
                length: 20,
                domain: null
            }
        ];

        nock(`https://coast.noaa.gov`)
            .get('/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/16?f=json')
            .reply(200, {
                fields
            });

        const response = await requester
            .post(`/api/v1/arcgis/fields/${dataset.id}`)
            .send({});

        const fieldsResponse = {};

        fields.forEach((el) => {
            fieldsResponse[el.name] = { type: el.type };
        });

        response.status.should.equal(200);
        response.body.should.have.property('tableName');
        response.body.tableName.should.equal(dataset.attributes.tableName);
        response.body.should.have.property('fields').and.deep.equal(fieldsResponse);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
