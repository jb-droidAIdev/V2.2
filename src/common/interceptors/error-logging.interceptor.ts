
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('ErrorLogging');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            catchError((err) => {
                const request = context.switchToHttp().getRequest();
                this.logger.error(`Error in ${request.method} ${request.url}: ${err.message}`);
                if (err.stack) {
                    this.logger.error(err.stack);
                }
                return throwError(() => err);
            }),
        );
    }
}
