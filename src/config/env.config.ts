import * as dotenv from 'dotenv';
import * as path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env';
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });
