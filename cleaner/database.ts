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
  
  console.log("Keyspace created or verified successfully");
} catch (error) {
  console.error("Error creating keyspace:", error);
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

export const findExpiredEntries = async (ttlSeconds: number): Promise<QueryResult<{id: string, short_code: string, created_at: Date}>> => {
  const cutoffDate = new Date();
  cutoffDate.setSeconds(cutoffDate.getSeconds() - ttlSeconds);
  
  return await query<{id: string, short_code: string, created_at: Date}>(
    'SELECT id, short_code, created_at FROM storage WHERE created_at < ? ALLOW FILTERING', 
    [cutoffDate]
  );
};

export const deleteEntry = async (id: string): Promise<void> => {
  await query('DELETE FROM storage WHERE id = ?', [id]);
}; 