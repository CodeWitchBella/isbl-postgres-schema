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
}).then(v => {
  if (Array.isArray(v)) for (const table of v) console.log(table)
  else console.log(v)
  knex.destroy()
})
