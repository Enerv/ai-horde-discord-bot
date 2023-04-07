exports.up = (db) => {
    return db.schema
    .createTable('requests', (table) => {
        table.text('id').primary();
        table.integer('status').defaultTo(0);
        table.text('user');
        table.text('channel');
        table.text('message');
        table.timestamp('createdAt').defaultTo(db.fn.now());
        table.timestamp('editedAt');
    });
};

exports.down = (db) => {
    return db.schema
    .dropTable('requests');
};