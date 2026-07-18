import { TokenPayload } from "../utils/auth";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
