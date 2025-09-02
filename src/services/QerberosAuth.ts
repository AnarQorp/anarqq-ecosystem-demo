// Qerberos Authentication Service for module communication
import {
  IQerberosAuth,
  AuthRequest,
  AuthResult,
  AuthorizationResult,
  AuditEntry,
  SignatureValidation
} from '../interfaces/ModuleCommunication.js';

export class QerberosAuth implements IQerberosAuth {
  private qerberosEndpoint: string;
  private authTokens: Map<string, AuthToken> = new Map();
  private auditTrail: AuditEntry[] = [];
  private permissions: Map<string, string[]> = new Map();

  constructor(qerberosEndpoint: string = 'http://localhost:3005') {
    this.qerberosEndpoint = qerberosEndpoint;
    this.initializeDefaultPermissions();
  }

  async authenticate(request: AuthRequest): Promise<AuthResult> {
    try {
      // Validate request
      this.validateAuthRequest(request);

      // Check if user exists and has valid credentials
      const isValidUser = await this.validateUser(request.userId);
      if (!isValidUser) {
        return {
          success: false,
          error: 'Invalid user credentials',
          auditCid: await this.generateAuditCid(request, false)
        };
      }

      // Generate authentication token
      const token = this.generateAuthToken(request.userId);
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store token
      this.authTokens.set(token, {
        userId: request.userId,
        moduleId: request.moduleId,
        expiresAt,
        permissions: this.permissions.get(request.userId) || []
      });

      // Generate audit trail
      const auditCid = await this.generateAuditCid(request, true);

      return {
        success: true,
        token,
        expiresAt,
        permissions: this.permissions.get(request.userId) || [],
        auditCid
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        auditCid: await this.generateAuditCid(request, false)
      };
    }
  }

  async authorize(token: string, resource: string, action: string): Promise<AuthorizationResult> {
    try {
      // Validate token
      const authToken = this.authTokens.get(token);
      if (!authToken) {
        return {
          authorized: false,
          reason: 'Invalid or expired token'
        };
      }

      // Check token expiration
      if (authToken.expiresAt < new Date()) {
        this.authTokens.delete(token);
        return {
          authorized: false,
          reason: 'Token expired'
        };
      }

      // Check permissions
      const requiredPermission = `${resource}:${action}`;
      const hasPermission = this.checkPermission(authToken.permissions, requiredPermission);

      if (!hasPermission) {
        return {
          authorized: false,
          reason: 'Insufficient permissions',
          requiredPermissions: [requiredPermission]
        };
      }

      // Generate audit trail for authorization
      const auditCid = await this.generateAuthorizationAudit(authToken.userId, resource, action, true);

      return {
        authorized: true,
        auditCid
      };

    } catch (error) {
      return {
        authorized: false,
        reason: error instanceof Error ? error.message : 'Authorization failed'
      };
    }
  }

  async generateAuditTrail(request: any, response: any): Promise<AuditEntry> {
    const auditEntry: AuditEntry = {
      id: this.generateUniqueId(),
      timestamp: new Date(),
      userId: request.userId || 'anonymous',
      moduleId: request.moduleId || 'unknown',
      action: request.action || 'unknown',
      resource: request.resource || 'unknown',
      success: response.success || false,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      auditCid: await this.generateContentId(request, response),
      qerberosSignature: await this.generateSignature(request, response)
    };

    // Store audit entry
    this.auditTrail.push(auditEntry);

    // Limit audit trail size
    if (this.auditTrail.length > 10000) {
      this.auditTrail.shift();
    }

    return auditEntry;
  }

  async validateSignature(data: any, signature: string): Promise<SignatureValidation> {
    try {
      // Simulate signature validation - in real implementation, this would use cryptographic verification
      const expectedSignature = await this.generateSignature(data, {});
      
      if (signature === expectedSignature) {
        return {
          valid: true,
          signer: 'qerberos-service',
          timestamp: new Date()
        };
      }

      return {
        valid: false,
        error: 'Signature validation failed'
      };

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Signature validation error'
      };
    }
  }

  /**
   * Initialize default permissions for demo purposes
   */
  private initializeDefaultPermissions(): void {
    // Demo user permissions
    this.permissions.set('demo-user', [
      'squid:read',
      'squid:write',
      'qlock:encrypt',
      'qlock:decrypt',
      'qindex:search',
      'qindex:index',
      'qdrive:upload',
      'qdrive:download',
      'qwallet:balance',
      'qwallet:transfer',
      'qsocial:post',
      'qsocial:read'
    ]);

    // Admin user permissions
    this.permissions.set('admin-user', [
      '*:*' // All permissions
    ]);

    // Service account permissions
    this.permissions.set('service-account', [
      'qerberos:authenticate',
      'qerberos:authorize',
      'qindex:*',
      'qlock:*'
    ]);
  }

  /**
   * Validate authentication request
   */
  private validateAuthRequest(request: AuthRequest): void {
    if (!request.userId || request.userId.trim() === '') {
      throw new Error('User ID is required');
    }

    if (!request.moduleId || request.moduleId.trim() === '') {
      throw new Error('Module ID is required');
    }

    if (!request.action || request.action.trim() === '') {
      throw new Error('Action is required');
    }

    if (!request.resource || request.resource.trim() === '') {
      throw new Error('Resource is required');
    }
  }

  /**
   * Validate user credentials
   */
  private async validateUser(userId: string): Promise<boolean> {
    // Simulate user validation - in real implementation, this would check against user database
    const validUsers = ['demo-user', 'admin-user', 'service-account', 'test-user'];
    return validUsers.includes(userId);
  }

  /**
   * Generate authentication token
   */
  private generateAuthToken(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `qerberos_${userId}_${timestamp}_${random}`;
  }

  /**
   * Check if user has required permission
   */
  private checkPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Check for wildcard permissions
    if (userPermissions.includes('*:*')) {
      return true;
    }

    // Check for exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for resource wildcard
    const [resource, action] = requiredPermission.split(':');
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }

    // Check for action wildcard
    if (userPermissions.includes(`*:${action}`)) {
      return true;
    }

    return false;
  }

  /**
   * Generate audit CID for authentication
   */
  private async generateAuditCid(request: AuthRequest, success: boolean): Promise<string> {
    const auditData = {
      userId: request.userId,
      moduleId: request.moduleId,
      action: request.action,
      resource: request.resource,
      timestamp: request.timestamp,
      success
    };

    return this.generateContentId(auditData, {});
  }

  /**
   * Generate audit trail for authorization
   */
  private async generateAuthorizationAudit(
    userId: string,
    resource: string,
    action: string,
    success: boolean
  ): Promise<string> {
    const auditData = {
      userId,
      resource,
      action,
      timestamp: new Date(),
      success
    };

    return this.generateContentId(auditData, {});
  }

  /**
   * Generate content ID (CID) for audit trail
   */
  private async generateContentId(data: any, metadata: any): Promise<string> {
    // Simulate CID generation - in real implementation, this would use IPFS CID generation
    const content = JSON.stringify({ data, metadata });
    const hash = this.simpleHash(content);
    return `Qm${hash}`;
  }

  /**
   * Generate Qerberos signature
   */
  private async generateSignature(data: any, metadata: any): Promise<string> {
    // Simulate signature generation - in real implementation, this would use cryptographic signing
    const content = JSON.stringify({ data, metadata });
    const hash = this.simpleHash(content);
    return `qerberos_sig_${hash}`;
  }

  /**
   * Simple hash function for demo purposes
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate unique ID
   */
  private generateUniqueId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get audit trail entries
   */
  getAuditTrail(limit: number = 100): AuditEntry[] {
    return this.auditTrail.slice(-limit);
  }

  /**
   * Get active tokens count
   */
  getActiveTokensCount(): number {
    // Clean expired tokens
    const now = new Date();
    for (const [token, authToken] of this.authTokens) {
      if (authToken.expiresAt < now) {
        this.authTokens.delete(token);
      }
    }
    
    return this.authTokens.size;
  }

  /**
   * Revoke authentication token
   */
  revokeToken(token: string): boolean {
    return this.authTokens.delete(token);
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): string[] {
    return this.permissions.get(userId) || [];
  }

  /**
   * Update user permissions
   */
  updateUserPermissions(userId: string, permissions: string[]): void {
    this.permissions.set(userId, permissions);
  }
}

/**
 * Authentication token interface
 */
interface AuthToken {
  userId: string;
  moduleId: string;
  expiresAt: Date;
  permissions: string[];
}