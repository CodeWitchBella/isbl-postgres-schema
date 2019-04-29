import Knex from 'knex'

type Options = {
  knex: Knex
  schema?: string
}

type InnerOptions = {
  knex: Knex
  schema: string
}

export type PgSchemaColumn = {
  table_catalog: string
  table_schema: string
  table_name: string
  column_name: string
  is_nullable: boolean
  data_type: string
  dtd_identifier: string
  column_default: string | null
  // there are many more columns but we do not need them
}

export type PgSchemaElementType = {
  object_name: string
  object_type: string
  collection_type_identifier: string
  data_type: string
  // again, there is more but we dont need it
}

function getColumns({ knex, schema }: InnerOptions): Promise<PgSchemaColumn[]> {
  return Promise.resolve(
    knex('information_schema.columns').where('table_schema', schema),
  ).then(v =>
    v.map((el: any) => ({
      ...el,
      is_nullable: el.is_nullable === 'YES',
    })),
  )
}

function getElementTypes({
  knex,
  schema,
}: InnerOptions): Promise<PgSchemaElementType[]> {
  return Promise.resolve(
    knex('information_schema.element_types').where('object_schema', schema),
  )
}

function getReferences({
  knex,
  schema,
}: InnerOptions): Promise<
  {
    table_name: string
    column_name: string
    foreign_table_name: string
    foreign_column_name: string
  }[]
> {
  return Promise.resolve(
    knex
      .raw(
        `SELECT
      tc.table_schema, 
      tc.constraint_name, 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = :schema;
    `,
        { schema },
      )
      .then(v => v.rows),
  )
}

function getComments({
  knex,
  schema,
}: InnerOptions): Promise<
  {
    table_name: string
    column_name: string
    description: string
  }[]
> {
  return Promise.resolve(
    knex
      .raw(
        `
    SELECT c.table_name,c.column_name,pgd.description
    FROM pg_catalog.pg_statio_all_tables as st
      inner join pg_catalog.pg_description pgd on (pgd.objoid=st.relid)
      inner join information_schema.columns c on (pgd.objsubid=c.ordinal_position
        and  c.table_schema=st.schemaname and c.table_name=st.relname)
    WHERE c.table_schema = :schema;
    `,
        { schema },
      )
      .then(v => v.rows),
  )
}

export default async function query({ schema = 'public', ...rest }: Options) {
  const opts = { ...rest, schema }
  return {
    columns: await getColumns(opts),
    elementTypes: await getElementTypes(opts),
    references: await getReferences(opts),
    comments: await getComments(opts),
  }
}
