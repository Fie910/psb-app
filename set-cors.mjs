import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import dotenv from 'dotenv';

// Paksa dotenv untuk membaca file .env.local
dotenv.config({ path: '.env.local' });

const bucketName = process.env.AWS_S3_BUCKET;

console.log('--- CEK VARIABEL ---');
console.log('Bucket:', bucketName || '❌ TIDAK TERBACA');
console.log('Endpoint:', process.env.AWS_ENDPOINT_URL_S3 || '❌ TIDAK TERBACA');
console.log('Access Key:', process.env.AWS_ACCESS_KEY_ID ? '✅ Ada' : '❌ TIDAK ADA');
console.log('Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Ada' : '❌ TIDAK ADA');
console.log('--------------------\n');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});

async function setCors() {
    const corsConfig = JSON.parse(fs.readFileSync('cors.json', 'utf8'));

    const command = new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: corsConfig,
    });

    try {
        await s3Client.send(command);
        console.log("✅ CORS berhasil diterapkan!");
    } catch (error) {
        console.error("❌ Gagal menerapkan CORS:", error.message);
    }
}

setCors();