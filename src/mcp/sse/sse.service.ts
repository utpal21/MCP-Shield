import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';

interface SSESession {
    sessionId: string;
    response: Response;
    tenantId: string;
    apiKeyId: string;
}

@Injectable()
export class SSEService {
    private sessions = new Map<string, SSESession>();

    createSession(response: Response, tenantId: string, apiKeyId: string): string {
        const sessionId = uuidv4();

        // Set SSE headers
        response.setHeader('Content-Type', 'text/event-stream');
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');
        response.setHeader('X-Accel-Buffering', 'no');

        // Send initial endpoint event
        this.send(sessionId, 'endpoint', `/sse/message?sessionId=${sessionId}`);

        // Store session
        this.sessions.set(sessionId, {
            sessionId,
            response,
            tenantId,
            apiKeyId,
        });

        // Start keepalive
        this.startKeepalive(sessionId);

        return sessionId;
    }

    send(sessionId: string, event: string, data: any): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }

        try {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            session.response.write(message);
            return true;
        } catch (error) {
            // Connection likely closed
            this.removeSession(sessionId);
            return false;
        }
    }

    private startKeepalive(sessionId: string): NodeJS.Timeout {
        return setInterval(() => {
            this.send(sessionId, 'ping', {});
        }, 15000); // 15 seconds
    }

    removeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            try {
                session.response.end();
            } catch (error) {
                // Ignore errors when closing
            }
            this.sessions.delete(sessionId);
        }
    }

    getSession(sessionId: string): SSESession | undefined {
        return this.sessions.get(sessionId);
    }
}