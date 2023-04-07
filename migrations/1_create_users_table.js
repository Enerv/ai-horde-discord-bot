exports.up = (db) => {
    return db.schema
    .createTable('users', (table) => {
        table.text('id').primary();
        table.timestamp('createdAt').defaultTo(db.fn.now());
    });
};

exports.down = (db) => {
    return db.schema
    .dropTable('users');
};