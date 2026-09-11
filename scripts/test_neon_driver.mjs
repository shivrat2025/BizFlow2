import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_MQYpxwa17zRV@ep-jolly-grass-b3c2d7vr-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

async function testNeonHttp() {
    console.log("Testing Neon Serverless HTTP query...");
    const res = await sql`SELECT count(*) FROM transactions;`;
    console.log("Neon HTTP Query Result:", res);
}

testNeonHttp().catch(console.error);
