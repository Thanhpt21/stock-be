import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AdminPreviewMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user as any;
    if (user?.role === 'admin') {
      req.query.isPreview = 'true';
    }
    next();
  }
}
