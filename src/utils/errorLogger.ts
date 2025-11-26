/**
 * Error Logger Utility
 * Centralized error logging for the application
 */

interface ErrorLog {
  message: string;
  stack?: string;
  context?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const MAX_STORED_ERRORS = 50;
const ERROR_STORAGE_KEY = 'app_error_logs';

export class ErrorLogger {
  /**
   * Log an error with context
   */
  static log(
    error: Error | string,
    context?: string,
    severity: ErrorLog['severity'] = 'medium'
  ): void {
    const errorLog: ErrorLog = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🔴 Error logged:', errorLog);
    }

    // Store in localStorage
    this.storeError(errorLog);

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorLog);
    }
  }

  /**
   * Store error in localStorage
   */
  private static storeError(errorLog: ErrorLog): void {
    try {
      const stored = localStorage.getItem(ERROR_STORAGE_KEY);
      const errors: ErrorLog[] = stored ? JSON.parse(stored) : [];
      
      // Add new error
      errors.push(errorLog);
      
      // Keep only recent errors
      const recentErrors = errors.slice(-MAX_STORED_ERRORS);
      
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(recentErrors));
    } catch (e) {
      console.error('Failed to store error:', e);
    }
  }

  /**
   * Send error to monitoring service (e.g., Sentry)
   */
  private static sendToMonitoring(errorLog: ErrorLog): void {
    // TODO: Implement monitoring service integration
    // Example: Sentry.captureException(errorLog);
    console.log('Would send to monitoring:', errorLog);
  }

  /**
   * Get all stored errors
   */
  static getStoredErrors(): ErrorLog[] {
    try {
      const stored = localStorage.getItem(ERROR_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to retrieve stored errors:', e);
      return [];
    }
  }

  /**
   * Clear all stored errors
   */
  static clearStoredErrors(): void {
    try {
      localStorage.removeItem(ERROR_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear stored errors:', e);
    }
  }

  /**
   * Get errors by severity
   */
  static getErrorsBySeverity(severity: ErrorLog['severity']): ErrorLog[] {
    return this.getStoredErrors().filter((error) => error.severity === severity);
  }

  /**
   * Get recent errors (last N errors)
   */
  static getRecentErrors(count: number = 10): ErrorLog[] {
    return this.getStoredErrors().slice(-count);
  }

  /**
   * Export errors as JSON for debugging
   */
  static exportErrors(): string {
    return JSON.stringify(this.getStoredErrors(), null, 2);
  }
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    ErrorLogger.log(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'Unhandled Promise Rejection',
      'high'
    );
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    ErrorLogger.log(
      event.error || new Error(event.message),
      'Global Error Handler',
      'high'
    );
  });

  // Log when leaving page with unsaved errors
  window.addEventListener('beforeunload', () => {
    const errors = ErrorLogger.getStoredErrors();
    if (errors.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`📝 ${errors.length} errors stored for debugging`);
    }
  });
}
