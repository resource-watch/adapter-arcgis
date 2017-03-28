class FieldSerializer {

    static serialize(fieldsData, tableName) {
        const fields = {};
        if (fieldsData) {
            fieldsData.forEach((el) => {
                fields[el.name] = { type: el.type };
            });
            return {
                tableName,
                fields
            };
        }
        return {
            tableName,
            fields: {}
        };
    }

}

module.exports = FieldSerializer;
