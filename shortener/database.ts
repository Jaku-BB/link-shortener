import { Client } from "cassandra-driver";

const contactPoints = [Deno.env.get("CASSANDRA_CONTACT_POINTS") || 'cassandra'];
const localDataCenter = Deno.env.get("CASSANDRA_DATACENTER") || 'datacenter1';
const keyspace = Deno.env.get("CASSANDRA_KEYSPACE") || 'link_shortener';

const client = new Client({
  contactPoints,
  localDataCenter,
  keyspace,
  socketOptions: {
    connectTimeout: 60000,
    readTimeout: 60000
  },
  pooling: {
    heartBeatInterval: 30000
  }
});

let connected = false;
let retries = 0;
const maxRetries = 10;

while (!connected && retries < maxRetries) {
  try {
    await client.connect();
    connected = true;
  } catch (error) {
    console.error("Error while connecting to Cassandra:", error);
    retries++;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

if (!connected) {
  throw new Error(`Failed to connect to Cassandra after ${maxRetries} attempts`);
}

export interface QueryResult<T> {
  rows: T[];
  rowLength: number;
}

export const query = async <T>(
  queryStr: string,
  params?: unknown[],
): Promise<QueryResult<T>> => {
  try {
    const result = await client.execute(queryStr, params, { prepare: true });
    
    const rows = result.rows ? result.rows : [];
    const rowLength = rows.length;
    
    return {
      rows: rows as unknown as T[],
      rowLength,
    };
  } catch (error) {
    console.error("Error while executing query:", error);
    return {
      rows: [],
      rowLength: 0,
    };
  }
};

export const incrementCounter = async (counterName: string, incrementValue = 1): Promise<number> => {
  try {
    const initQuery = 'UPDATE counter_table SET counter_value = counter_value + 0 WHERE counter_name = ?';
    await client.execute(initQuery, [counterName], { prepare: true });
    
    const incrementQuery = 'UPDATE counter_table SET counter_value = counter_value + ? WHERE counter_name = ?';
    await client.execute(incrementQuery, [incrementValue, counterName], { prepare: true });
    
    const getCounterQuery = 'SELECT counter_value FROM counter_table WHERE counter_name = ?';
    const result = await client.execute(getCounterQuery, [counterName], { prepare: true });
    
    if (result.rows && result.rows.length > 0 && result.rows[0].counter_value) {
      return Number(result.rows[0].counter_value.toString());
    } else {
      return incrementValue;
    }
  } catch (error) {
    console.error("Error while incrementing counter:", error);
    return incrementValue;
  }
};
