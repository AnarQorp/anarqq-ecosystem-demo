/**
 * Qerberos signature information
 */
export interface QerberosSignature {
  signature: string;
  publicKey: string;
  algorithm: string;
  timestamp: Date;
  signedData: any;
  metadata: {
    version: string;
    keyId: string;
    nonce: string;
  };
}

/**
 * Audit trail entry
 */
export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  operation: string;
  userId: string;
  moduleId: string;
  data: any;
  qerberosSignature: QerberosSignature;
  contentId?: string;
  auditCid: string;
  previousAuditCid?: string;
  integrity: {
    hash: string;
    algorithm: string;
  };
}

/**
 * Audit trail validation result
 */
export interface AuditTrailValidationResult {
  isValid: boolean;
  entryId: string;
  validations: {
    signatureValid: boolean;
    contentIntegrityValid: boolean;
    chainIntegrityValid: boolean;
    timestampValid: boolean;
    cidValid: boolean;
  };
  errors: string[];
  warnings: string[];
  metadata: {
    validatedAt: Date;
    validationDuration: number;
    qerberosVersion: string;
  };
}

/**
 * Audit chain validation result
 */
export interface AuditChainValidationResult {
  isValid: boolean;
  chainLength: number;
  validEntries: number;
  invalidEntries: number;
  brokenLinks: string[];
  tamperedEntries: string[];
  missingEntries: string[];
  validationSummary: {
    signatureValidation: number; // Percentage of valid signatures
    contentIntegrity: number; // Percentage of valid content
    chainIntegrity: number; // Percentage of valid chain links
  };
  errors: string[];
  warnings: string[];
}

/**
 * Tamper detection configuration
 */
export interface TamperDetectionConfig {
  enabled: boolean;
  algorithms: string[]; // Hash algorithms to use for detection
  thresholds: {
    maxTimestampDrift: number; // Maximum allowed timestamp drift in ms
    minSignatureStrength: number; // Minimum signature strength (0-1)
    maxChainGaps: number; // Maximum allowed gaps in audit chain
  };
  monitoring: {
    realTimeEnabled: boolean;
    alertOnTamper: boolean;
    quarantineOnTamper: boolean;
  };
}

/**
 * Tamper detection result
 */
export interface TamperDetectionResult {
  tamperedEntries: string[];
  suspiciousEntries: string[];
  tamperTypes: {
    signatureTamper: string[];
    contentTamper: string[];
    timestampTamper: string[];
    chainTamper: string[];
  };
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // Confidence level (0-1)
  recommendations: string[];
}

/**
 * Audit trail collection configuration
 */
export interface AuditCollectionConfig {
  modules: string[]; // Modules to collect audit trails from
  operations: string[]; // Operations to audit
  retentionPeriod: number; // Retention period in milliseconds
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  replicationFactor: number; // Number of replicas to maintain
}

/**
 * Audit trail analysis result
 */
export interface AuditAnalysisResult {
  totalEntries: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  operationSummary: Record<string, number>;
  moduleSummary: Record<string, number>;
  userSummary: Record<string, number>;
  integrityScore: number; // Overall integrity score (0-1)
  anomalies: {
    unusualPatterns: string[];
    suspiciousActivities: string[];
    performanceAnomalies: string[];
  };
  recommendations: string[];
}

/**
 * Core interface for audit trail validation
 * Implements Qerberos signature validation and audit CID verification
 */
export interface IAuditTrailValidation {
  /**
   * Validate a single audit trail entry
   * @param entry - Audit trail entry to validate
   * @returns Promise resolving to validation result
   */
  validateAuditEntry(entry: AuditTrailEntry): Promise<AuditTrailValidationResult>;

  /**
   * Validate Qerberos signature
   * @param signature - Qerberos signature to validate
   * @param data - Original data that was signed
   * @returns Promise resolving to signature validation result
   */
  validateQerberosSignature(signature: QerberosSignature, data: any): Promise<boolean>;

  /**
   * Validate audit CID (Content Identifier)
   * @param auditCid - Audit CID to validate
   * @param entry - Audit entry associated with the CID
   * @returns Promise resolving to CID validation result
   */
  validateAuditCid(auditCid: string, entry: AuditTrailEntry): Promise<boolean>;

  /**
   * Validate entire audit chain
   * @param entries - Array of audit trail entries in chronological order
   * @returns Promise resolving to chain validation result
   */
  validateAuditChain(entries: AuditTrailEntry[]): Promise<AuditChainValidationResult>;

  /**
   * Collect audit trails from specified modules
   * @param config - Collection configuration
   * @returns Promise resolving to collected audit entries
   */
  collectAuditTrails(config: AuditCollectionConfig): Promise<AuditTrailEntry[]>;

  /**
   * Detect tampering in audit trails
   * @param entries - Audit trail entries to analyze
   * @param config - Tamper detection configuration
   * @returns Promise resolving to tamper detection result
   */
  detectTampering(
    entries: AuditTrailEntry[], 
    config: TamperDetectionConfig
  ): Promise<TamperDetectionResult>;

  /**
   * Analyze audit trail patterns and anomalies
   * @param entries - Audit trail entries to analyze
   * @returns Promise resolving to analysis result
   */
  analyzeAuditTrails(entries: AuditTrailEntry[]): Promise<AuditAnalysisResult>;

  /**
   * Verify content integrity using audit trail
   * @param contentId - Content identifier to verify
   * @param auditCid - Associated audit CID
   * @returns Promise resolving to integrity verification result
   */
  verifyContentIntegrity(contentId: string, auditCid: string): Promise<{
    isValid: boolean;
    contentHash: string;
    auditHash: string;
    errors: string[];
  }>;

  /**
   * Generate audit trail report
   * @param entries - Audit trail entries to include in report
   * @param includeDetails - Whether to include detailed validation results
   * @returns Promise resolving to audit report
   */
  generateAuditReport(
    entries: AuditTrailEntry[], 
    includeDetails: boolean
  ): Promise<{
    summary: AuditAnalysisResult;
    validationResults: AuditTrailValidationResult[];
    chainValidation: AuditChainValidationResult;
    tamperDetection: TamperDetectionResult;
    generatedAt: Date;
  }>;

  /**
   * Start continuous audit trail monitoring
   * @param config - Monitoring configuration
   * @returns Promise resolving when monitoring starts
   */
  startAuditMonitoring(config: {
    intervalMs: number;
    tamperDetection: TamperDetectionConfig;
    alerting: {
      enabled: boolean;
      webhookUrl?: string;
      emailRecipients?: string[];
    };
  }): Promise<void>;

  /**
   * Stop audit trail monitoring
   * @returns Promise resolving when monitoring stops
   */
  stopAuditMonitoring(): Promise<void>;

  /**
   * Get audit trail statistics
   * @param timeRange - Time range for statistics
   * @returns Promise resolving to audit statistics
   */
  getAuditStatistics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<{
    totalEntries: number;
    validEntries: number;
    invalidEntries: number;
    tamperAttempts: number;
    integrityScore: number;
    moduleBreakdown: Record<string, number>;
    operationBreakdown: Record<string, number>;
  }>;
}