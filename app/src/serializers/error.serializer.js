class ErrorSerializer {

    static serializeArcgisServerErrors(err) {
        return {
            errors: [{
                status: err.statusCode || 500,
                detail: err.message,
                requestURL: err.requestURL
            }]
        };
    }

    static serializeError(status, message) {
        return {
            errors: [{
                status,
                detail: message
            }]
        };
    }

}

module.exports = ErrorSerializer;
