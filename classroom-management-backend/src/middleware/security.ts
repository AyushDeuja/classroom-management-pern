import { NextFunction, Request, Response } from "express";
import { aj } from "../config/arcjet";
import { ArcjetNodeRequest, slidingWindow } from "@arcjet/node";

const securityMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.NODE_ENV === "test") return next();
  try {
    const role: RateLimitRoles = req.user?.role ?? "guest";
    let limit: number;
    let message: string;
    switch (role) {
      case "admin":
        limit = 20;
        message = "Admin Limit Exceeded (20 per min). Slow Down.";
        break;
      case "teacher":
        limit = 15;
        message = "Teacher Limit Exceeded (15 per min). Slow Down.";
        break;
      case "student":
        limit = 10;
        message = "User Limit Exceeded (10 per min). Please Wait.";
        break;
      default:
        limit = 5;
        message =
          "Guest Limit Exceeded (5 per min). Please Sign In for higher limits.";
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: "LIVE",
        interval: "1m",
        max: limit,
      }),
    );

    const arcjetRequest: ArcjetNodeRequest = {
      headers: req.headers,
      method: req.method,
      url: req.originalUrl ?? req.url,
      socket: {
        remoteAddress: req.socket.remoteAddress ?? req.ip ?? "0.0.0.0",
      },
    };
    const decision = await client.protect(arcjetRequest);
    if (decision.isDenied() && decision.reason.isBot()) {
      res.status(403).json({
        error: "Forbidden",
        message: "Automated requests are not allowed",
      });
    }

    if (decision.isDenied() && decision.reason.isShield()) {
      res.status(403).json({
        error: "Forbidden",
        message: "Request is blocked due to security policy",
      });
    }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
      res.status(403).json({
        error: "Too Many Requests",
        message,
      });
    }

    next();
  } catch (err) {
    console.error("Arcjet Middleware Error: ", err);
    res.status(500).json({
      error: "Internal Error",
      message: "Something went wrong with security middleware",
    });
  }
};

export default securityMiddleware;
