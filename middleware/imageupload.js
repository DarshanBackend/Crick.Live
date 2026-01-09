import dotenv from "dotenv";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

dotenv.config({ path: '.env' });

const S3_BUCKET = process.env.S3_BUCKET || "cricklive";
const S3_REGION = process.env.S3_REGION || "eu-north-1";

const validateS3Credentials = () => {
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;
    
    if (!accessKey || !secretKey) {
        throw new Error("S3 credentials not configured. Please set S3_ACCESS_KEY and S3_SECRET_KEY in .env file");
    }
    
    if (accessKey.trim() === '' || secretKey.trim() === '') {
        throw new Error("S3 credentials are empty. Please check your .env file");
    }
    
    return {
        accessKeyId: accessKey.trim(),
        secretAccessKey: secretKey.trim()
    };
};

const getS3Url = (key) => {
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
};

let s3;
try {
    const credentials = validateS3Credentials();
    s3 = new S3Client({
        region: S3_REGION,
        credentials: credentials,
        forcePathStyle: false
    });
} catch (error) {
    console.error("⚠️ S3 Client initialization failed:", error.message);
    s3 = null;
}

export const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif','image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only image files are allowed.'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadFile = async (file) => {
    try {
        if (!file || !file.buffer) {
            throw new Error("No valid file provided");
        }

        if (!s3) {
            const credentials = validateS3Credentials();
            s3 = new S3Client({
                region: S3_REGION,
                credentials: credentials,
                forcePathStyle: false
            });
        }

        const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        const key = `users/${fileName}`;

        let buffer;
        let contentType = 'image/jpeg';

        try {
            buffer = await sharp(file.buffer)
                .resize(500, 500, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({
                    quality: 80,
                    progressive: true
                })
                .toBuffer();
            contentType = "image/jpeg";
        } catch (sharpError) {
            console.log("Image processing failed, using original:", sharpError.message);
            buffer = file.buffer;
            contentType = file.mimetype;
        }

        const uploadParams = {
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType
        };

        await s3.send(new PutObjectCommand(uploadParams));

        const url = getS3Url(key);
        return {
            url: url,
            key: key
        };

    } catch (error) {
        console.error("❌ S3 Upload Error:");
        console.error("Name:", error.name);
        console.error("Message:", error.message);
        console.error("Code:", error.code);

        if (error.name === 'PermanentRedirect') {
            const suggestedRegion = error.Endpoint ? error.Endpoint.split('.')[2] : S3_REGION;
            throw new Error(`Bucket region mismatch. The bucket is in '${suggestedRegion}' region, but you're using '${S3_REGION}'. Please set S3_REGION=${suggestedRegion} in your .env file.`);
        }

        throw new Error(`Upload failed: ${error.message}`);
    }
};

export const deleteFileFromS3 = async (fileUrl) => {
    try {
        if (!fileUrl || fileUrl.includes('default-user.jpg')) {
            return;
        }

        if (!fileUrl.includes('amazonaws.com')) {
            console.log("Skipping non-S3 URL:", fileUrl);
            return;
        }

        if (!s3) {
            const credentials = validateS3Credentials();
            s3 = new S3Client({
                region: S3_REGION,
                credentials: credentials,
                forcePathStyle: false
            });
        }

        const url = new URL(fileUrl);
        const bucket = url.hostname.split('.')[0];
        const key = url.pathname.substring(1);

        await s3.send(
            new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            })
        );

    } catch (err) {
        console.error("❌ Delete error:", err.message);
    }
};

export const listBucketObjects = async (prefix = 'users/') => {
    try {
        const currentRegion = process.env.S3_REGION || "eu-north-1";
        const currentBucket = process.env.S3_BUCKET || "cricklive";
        
        
        const credentials = validateS3Credentials();
        const s3Client = new S3Client({
            region: currentRegion,
            credentials: credentials,
            forcePathStyle: false
        });

        const command = new ListObjectsV2Command({
            Bucket: currentBucket,
            Prefix: prefix
        });

        const response = await s3Client.send(command);
        
        if (!response.Contents) {
            return [];
        }

        const getCurrentS3Url = (key) => {
            return `https://${currentBucket}.s3.${currentRegion}.amazonaws.com/${key}`;
        };

        const images = response.Contents.map(item => ({
            key: item.Key,
            url: getCurrentS3Url(item.Key),
            size: item.Size,
            lastModified: item.LastModified
        }));

        return images;
    } catch (error) {
        console.error("❌ List objects error:", error.message);
        console.error("Error details:", error);
        
        if (error.name === 'PermanentRedirect') {
            const suggestedRegion = error.Endpoint ? error.Endpoint.split('.')[2] : S3_REGION;
            throw new Error(`Bucket region mismatch. The bucket is in '${suggestedRegion}' region, but you're using '${S3_REGION}'. Please set S3_REGION=${suggestedRegion} in your .env file.`);
        }
        
        if (error.message.includes("credentials") || error.message.includes("Credential")) {
            throw new Error("S3 credentials are invalid or missing. Please check your .env file and ensure S3_ACCESS_KEY and S3_SECRET_KEY are set correctly.");
        }
        
        throw new Error(`Failed to list S3 objects: ${error.message}`);
    }
};

export const deleteFromS3 = async (key) => {
    try {
        if (!key) {
            throw new Error("Key is required");
        }

        if (!s3) {
            const credentials = validateS3Credentials();
            s3 = new S3Client({
                region: S3_REGION,
                credentials: credentials,
                forcePathStyle: false
            });
        }

        await s3.send(
            new DeleteObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
            })
        );

        return true;
    } catch (err) {
        console.error("❌ Delete error:", err.message);
        throw new Error(`Failed to delete from S3: ${err.message}`);
    }
};

export const deleteManyFromS3 = async (keys) => {
    try {
        if (!Array.isArray(keys) || keys.length === 0) {
            throw new Error("Keys array is required");
        }

        if (!s3) {
            const credentials = validateS3Credentials();
            s3 = new S3Client({
                region: S3_REGION,
                credentials: credentials,
                forcePathStyle: false
            });
        }


        const deletePromises = keys.map(key => 
            s3.send(
                new DeleteObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: key,
                })
            )
        );

        await Promise.all(deletePromises);

        return true;
    } catch (err) {
        console.error("❌ Delete many error:", err.message);
        throw new Error(`Failed to delete multiple files from S3: ${err.message}`);
    }
};