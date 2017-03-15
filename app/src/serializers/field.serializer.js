class FieldSerializer {

    static serialize(data, tableName) {
        return {
            tableName,
            fields: data
        };
    }

}

module.exports = FieldSerializer;
