class FieldSerializer {

    static serialize(fieldsData, tableName) {
        const fields = {};
        fieldsData.forEach((el) => {
            fields[el.name] = { type: el.type };
        });
        return {
            tableName,
            fields
        };
    }

}

module.exports = FieldSerializer;
