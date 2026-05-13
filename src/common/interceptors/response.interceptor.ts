import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If already in response format, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data as Response<T>;
        }

        // Extract message if present, otherwise use default
        let message = 'Success';
        let responseData = data;

        if (data && typeof data === 'object' && 'message' in data) {
          message = (data as any).message;
          // Remove message from data if it's the only field
          const { message: _, ...rest } = data as any;
          responseData = Object.keys(rest).length > 0 ? rest : null;
        }

        return {
          success: true,
          data: responseData,
          message,
        };
      }),
    );
  }
}