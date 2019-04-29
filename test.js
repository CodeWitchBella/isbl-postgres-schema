const getSchema = require('./dist/index')

const knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'password',
    database: 'rest',
  },
})

getSchema({
  knex,
}).then(({ tables }) => {
  for (const table of tables) {
    for (const column of table.columns) {
      if (column.comment) {
        console.log(table.name, column.name, column.comment)
      }
    }
  }
  if (Array.isArray(tables)) for (const table of tables) console.log(table)
  else console.log(tables)
  knex.destroy()
})
