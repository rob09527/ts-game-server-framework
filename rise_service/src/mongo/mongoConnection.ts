
import mongoose, { ConnectOptions, Connection } from 'mongoose';

export interface MongoConfig {
    uri: string;
    options?: ConnectOptions;
    retryInterval?: number;
    maxRetries?: number;
}

export class MongoConnection {
    private static instance: MongoConnection;
    private connection!: Connection;
    private retryCount = 0;
    private constructor(private config: MongoConfig) {

    }

    static getInstance(config: MongoConfig): MongoConnection {
        if (!MongoConnection.instance) {
            MongoConnection.instance = new MongoConnection({
                uri: config.uri,
                options: {
                    autoIndex: true,
                    maxPoolSize: 100,
                    connectTimeoutMS: 5000,
                    ...config.options
                },
                retryInterval: config.retryInterval || 5000,
                maxRetries: config.maxRetries || 5
            });
        }
        return MongoConnection.instance;
    }

    async connect(): Promise<Connection> {
        try {
            await mongoose.connect(this.config.uri, this.config.options);
            this.connection = mongoose.connection;
            this.setupEventListeners();
            return this.connection;
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    private setupEventListeners() {
        this.connection.on('connected', () => {
            console.log(`Connected to MongoDB at ${this.config.uri}`);
            this.retryCount = 0;
        });

        this.connection.on('error', (error: Error) => {
            console.error('MongoDB Error:', error.message);
            this.handleError(error);
        });

        this.connection.on('disconnected', () => {
            console.warn('MongoDB connection lost');
            this.handleReconnect();
        });
    }

    private async handleReconnect() {
        if (this.retryCount < this.config.maxRetries!) {
            this.retryCount++;
            console.log(`Retry attempt ${this.retryCount} in ${this.config.retryInterval}ms`);
            setTimeout(() => this.connect(), this.config.retryInterval);
        } else {
            console.error('Maximum retry attempts reached');
            process.exit(1);
        }
    }

    private handleError(error: Error) {
        console.error('Critical DB Error:', error.message);
        if (this.retryCount >= this.config.maxRetries!) {
            process.exit(1);
        }
    }

    async disconnect() {
        await mongoose.disconnect();
        console.log('MongoDB connection closed');
    }
}

