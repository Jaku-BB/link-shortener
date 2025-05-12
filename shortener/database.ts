import { Client } from "cassandra-driver";

const contactPointsStr = Deno.env.get("CASSANDRA_CONTACT_POINTS") || 'cassandra-1,cassandra-2,cassandra-3';
const contactPoints = contactPointsStr.split(',');
const localDataCenter = Deno.env.get("CASSANDRA_DATACENTER") || 'datacenter1';
const keyspace = Deno.env.get("CASSANDRA_KEYSPACE") || 'link_shortener';

const initialClient = new Client({
  contactPoints,
  localDataCenter,
  socketOptions: {
    connectTimeout: 60000,
    readTimeout: 60000
  }
});

await initialClient.connect();

try {
  const keyspaceQuery = `
    CREATE KEYSPACE IF NOT EXISTS ${keyspace}
    WITH REPLICATION = { 'class' : 'NetworkTopologyStrategy', 'datacenter1' : 3 };
  `;
  await initialClient.execute(keyspaceQuery);
  
  const createStorageTableQuery = `
    CREATE TABLE IF NOT EXISTS ${keyspace}.storage (
      id UUID PRIMARY KEY,
      original_url TEXT,
      short_code TEXT,
      created_at TIMESTAMP
    );
  `;
  await initialClient.execute(createStorageTableQuery);
  
  const createCounterTableQuery = `
    CREATE TABLE IF NOT EXISTS ${keyspace}.counter_table (
      counter_name TEXT PRIMARY KEY,
      counter_value COUNTER
    );
  `;
  await initialClient.execute(createCounterTableQuery);
  
  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_short_code ON ${keyspace}.storage (short_code);
  `;
  await initialClient.execute(createIndexQuery);
  
  console.log("Keyspace and tables created successfully");
} catch (error) {
  console.error("Error creating keyspace or tables:", error);
}

await initialClient.shutdown();

const client = new Client({
  contactPoints,
  localDataCenter,
  keyspace,
  socketOptions: {
    connectTimeout: 60000,
    readTimeout: 60000
  },
  pooling: {
    heartBeatInterval: 30000,
    coreConnectionsPerHost: {
      '0': 2,
      '1': 1,
      '2': 1
    }
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
    const result = await client.execute(queryStr, params, { 
      prepare: true
    });
    
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
    await client.execute(initQuery, [counterName], { 
      prepare: true
    });
    
    const incrementQuery = 'UPDATE counter_table SET counter_value = counter_value + ? WHERE counter_name = ?';
    await client.execute(incrementQuery, [incrementValue, counterName], { 
      prepare: true
    });
    
    const getCounterQuery = 'SELECT counter_value FROM counter_table WHERE counter_name = ?';
    const result = await client.execute(getCounterQuery, [counterName], { 
      prepare: true
    });
    
    if (result.rows && result.rows.length > 0 && result.rows[0].counter_value) {
      return Number(result.rows[0].counter_value.toString());
    } else {
      console.error('Counter value not found, returning default value');
      return incrementValue;
    }
  } catch (error) {
    console.error("Error while incrementing counter:", error);
    return incrementValue;
  }
};
