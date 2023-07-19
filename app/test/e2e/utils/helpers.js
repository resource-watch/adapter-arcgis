const nock = require('nock');
const { mockValidateRequest, mockCloudWatchLogRequest } = require('rw-api-microservice-node/dist/test-mocks');
const config = require('config');

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

    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
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

const APPLICATION = {
    data: {
        type: 'applications',
        id: '649c4b204967792f3a4e52c9',
        attributes: {
            name: 'grouchy-armpit',
            organization: null,
            user: null,
            apiKeyValue: 'a1a9e4c3-bdff-4b6b-b5ff-7a60a0454e13',
            createdAt: '2023-06-28T15:00:48.149Z',
            updatedAt: '2023-06-28T15:00:48.149Z'
        }
    }
};

const mockValidateRequestWithApiKey = ({
    apiKey = 'api-key-test',
    application = APPLICATION
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        application,
        apiKey
    });
    mockCloudWatchLogRequest({
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

module.exports = {
    mockValidateRequestWithApiKey,
    createMockGetDataset,
    ensureCorrectError
};
