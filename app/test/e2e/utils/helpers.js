const nock = require('nock');

const createMockGetDataset = (id, anotherData = {}) => {
    const dataset = {
        id,
        type: 'dataset',
        attributes: {
            name: 'Test dataset 1',
            slug: 'test-dataset-1',
            type: 'tabular',
            subtitle: null,
            application: [
                'rw'
            ],
            dataPath: null,
            attributesPath: null,
            connectorType: 'rest',
            provider: 'featureservice',
            userId: '1',
            connectorUrl: 'https://coast.noaa.gov/arcgis/rest/services/sovi/sovi_tracts2010/MapServer/16?f=pjson',
            sources: [],
            tableName: 'sovisovi_tracts2010MapServer16',
            status: 'saved',
            published: false,
            overwrite: true,
            mainDateField: null,
            env: 'production',
            geoInfo: false,
            protected: false,
            clonedHost: {},
            legend: {},
            errorMessage: null,
            taskId: null,
            createdAt: '2016-08-01T15:28:15.050Z',
            updatedAt: '2018-01-05T18:15:23.266Z',
            dataLastUpdated: null,
            widgetRelevantProps: [],
            layerRelevantProps: [],
            ...anotherData
        }
    };

    nock(process.env.CT_URL)
        .get(`/v1/dataset/${id}`)
        .reply(200, {
            data: dataset
        });

    return dataset;
};

const ensureCorrectError = ({ status, body }, errMessage, expectedStatus) => {
    status.should.equal(expectedStatus);
    body.should.have.property('errors').and.be.an('array');
    body.errors[0].should.have.property('detail').and.equal(errMessage);
    body.errors[0].should.have.property('status').and.equal(status);
};

module.exports = {
    createMockGetDataset,
    ensureCorrectError
};
