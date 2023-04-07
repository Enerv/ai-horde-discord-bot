exports.up = (db) => {
    return db.schema
    .createTable('messages', (table) => {
        table.text('id').primary();
        table.integer('bot').defaultTo(0);
        table.text('user');
        table.text('content');
        table.timestamp('createdAt').defaultTo(db.fn.now());
    });
};

exports.down = (db) => {
    return db.schema
    .dropTable('messages');
};