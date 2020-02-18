const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');

chai.should();

const requester = getTestServer();

describe('Delete Carto dataset', () => {

    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Deleting a featureservice dataset does nothing and returns a 200 status code', async () => {
        const response = await requester
            .delete(`/api/v1/arcgis/rest-datasets/featureservice/12345`)
            .send({});

        response.status.should.equal(204);
    });

    after(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
