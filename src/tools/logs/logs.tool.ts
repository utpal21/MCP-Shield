import { Injectable } from '@nestjs/common';
import { LoggingService } from '../../logging/logging.service';
import { LogQuery } from '../../logging/logging.service';

export interface LogsGetArgs {
    limit?: number;
    offset?: number;
    tool?: string;
    from?: string;
    to?: string;
    status?: 'success' | 'error' | 'blocked';
}

@Injectable()
export class LogsToolService {
    constructor(private logging: LoggingService) { }

    async get(tenantId: string, args: LogsGetArgs): Promise<any> {
        const query: LogQuery = {
            limit: args.limit || 50,
            offset: args.offset || 0,
        };

        if (args.tool) {
            query.tool = args.tool;
        }

        if (args.from) {
            query.from = new Date(args.from);
        }

        if (args.to) {
            query.to = new Date(args.to);
        }

        if (args.status) {
            query.status = args.status;
        }

        const result = await this.logging.query(tenantId, query);

        return {
            total: result.total,
            items: result.items,
            hasMore: result.hasMore,
        };
    }
}