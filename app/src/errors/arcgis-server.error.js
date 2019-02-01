class ArcgisServerError extends Error {

    constructor(message, requestURL) {
        super(message);
        this.name = 'ArcGISServer';
        this.message = message;
        this.requestURL = requestURL;
    }

}

module.exports = ArcgisServerError;
