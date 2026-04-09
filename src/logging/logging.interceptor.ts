import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, headers } = request;
        const startTime = Date.now();

        this.logger.log(`Incoming request: ${method} ${url}`);

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - startTime;
                    this.logger.log(`Request completed: ${method} ${url} (${duration}ms)`);
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    this.logger.error(`Request failed: ${method} ${url} (${duration}ms)`, error.stack);
                },
            }),
        );
    }
}