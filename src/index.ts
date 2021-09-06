import type { Knex } from 'knex'
import query, { PgSchemaElementType, PgSchemaColumn } from './queries'

function typeForColumn(
  column: PgSchemaColumn,
  elementTypes: PgSchemaElementType[],
) {
  const type = column.data_type
  if (type === 'ARRAY') {
    const t = elementTypes.find(
      (et) =>
        et.object_name === column.table_name &&
        et.object_type === 'TABLE' &&
        et.collection_type_identifier === column.dtd_identifier,
    )
    return { isArray: true, type: t!.data_type }
  } else {
    return { isArray: false, type }
  }
}

export default async function getSchema({ knex }: { knex: Knex }) {
  const { columns, elementTypes, references, comments } = await query({ knex })

  const tableMap = new Map<string, typeof columns>()
  for (const column of columns) {
    let table = tableMap.get(column.table_name)
    if (!table) {
      table = []
      tableMap.set(column.table_name, table)
    }
    table.push(column)
  }

  const commentMap = new Map<string, Map<string, string>>()
  for (const comment of comments) {
    if (!commentMap.has(comment.table_name))
      commentMap.set(comment.table_name, new Map())
    const columns = commentMap.get(comment.table_name)!
    columns.set(comment.column_name, comment.description)
  }
  function getComment(table: string, column: string): string | null {
    const columns = commentMap.get(table)
    if (!columns) return null
    const comment = columns.get(column)
    if (comment === undefined) return null // allows empty string
    return comment
  }

  const tables = Array.from(tableMap.entries()).map(([tableName, columns]) => {
    return {
      name: tableName,
      columns: columns.map((col) => {
        const target = references.find(
          (r) =>
            r.column_name === col.column_name &&
            r.table_name === col.table_name,
        )
        return {
          ...typeForColumn(col, elementTypes),
          name: col.column_name,
          nullable: col.is_nullable,
          references: target
            ? {
                table: target.foreign_table_name,
                column: target.foreign_column_name,
              }
            : null,
          hasDefault: !!col.column_default,
          comment: getComment(tableName, col.column_name),
        }
      }),
    }
  })
  return { tables }
}
