import fs from 'fs';
import path from 'path';

/**
 * Centralized logger for the ETHCluj Conference QnA system
 * Provides consistent logging to both console and files
 */
export class Logger {
  /**
   * Log an informational message
   */
  static info(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[INFO] [${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}`;
    console.log(logMessage);
    Logger.appendToLogFile('info', logMessage);
  }

  /**
   * Log an error message
   */
  static error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error ? 
      { message: error.message, stack: error.stack } : 
      error;
    const logMessage = `[ERROR] [${timestamp}] ${message} ${errorDetails ? JSON.stringify(errorDetails) : ''}`;
    console.error(logMessage);
    Logger.appendToLogFile('error', logMessage);
  }

  /**
   * Log a debug message (only if DEBUG=true)
   */
  static debug(message: string, data?: any) {
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      const logMessage = `[DEBUG] [${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}`;
      console.debug(logMessage);
      Logger.appendToLogFile('debug', logMessage);
    }
  }

  /**
   * Append a message to the appropriate log file
   */
  private static appendToLogFile(level: string, message: string) {
    try {
      const logDir = process.env.LOG_DIR || 'logs';
      const logFile = path.join(logDir, `${level}.log`);
      
      // Create logs directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Append to log file
      fs.appendFileSync(logFile, message + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }
}

// Export a default logger instance
export const logger = {
  info: Logger.info,
  error: Logger.error,
  debug: Logger.debug
};
