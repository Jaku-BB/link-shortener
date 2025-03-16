import databaseDriver from "pg";
import { QueryResult, QueryResultRow } from "npm:@types/pg@8.11.11";
const { Pool } = databaseDriver;

const databaseUrl = Deno.env.get("DATABASE_URL") || 'postgresql://link-shortener:secret@database:5432/link_shortener';
console.log("Using database URL:", databaseUrl);

const connectionPool = new Pool({
    connectionString: databaseUrl,
});

export const query = async <T extends QueryResultRow>(
    query: string,
    params?: (string | number)[],
): Promise<QueryResult<T>> => {
    const start = Date.now();
    const result = await connectionPool.query<T>(query, params);
    const duration = Date.now() - start;

    console.log("Query: ", { query, duration, resultCount: result.rowCount });

    return result;
};
