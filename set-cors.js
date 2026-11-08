import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import fs from 'fs';

const s3Client = new S3Client({
    region: process.env.NEON_STORAGE_REGION,
    endpoint: process.env.NEON_STORAGE_ENDPOINT,
    credentials: {
        accessKeyId: process.env.NEON_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEON_STORAGE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});

async function setCors() {
    const corsConfig = JSON.parse(fs.readFileSync('cors.json', 'utf8'));

    const command = new PutBucketCorsCommand({
        Bucket: process.env.NEON_STORAGE_BUCKET,
        CORSConfiguration: corsConfig,
    });

    try {
        await s3Client.send(command);
        console.log("✅ CORS berhasil diterapkan!");
    } catch (error) {
        console.error("❌ Gagal menerapkan CORS:", error);
    }
}

setCors();