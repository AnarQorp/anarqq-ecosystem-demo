// Q∞ Data Flow Interface for AnarQ&Q Ecosystem Demo
// Implements the complete data processing pipeline: Qompress → Qlock → Qindex → Qerberos → IPFS

export interface IQInfinityDataFlow {
  // Forward data flow processing
  processInput(data: any, userId: string): Promise<ProcessingResult>;
  
  // Reverse data flow processing
  retrieveOutput(contentId: string, userId: string): Promise<RetrievalResult>;
  
  // Integrity validation
  validateIntegrity(contentId: string): Promise<IntegrityResult>;
  
  // Flow metrics
  getFlowMetrics(): Promise<FlowMetrics>;
  
  // Pipeline step validation
  validatePipelineStep(step: PipelineStep, data: any): Promise<StepValidationResult>;
}

// Processing result for forward flow
export interface ProcessingResult {
  success: boolean;
  contentId: string;
  auditCid: string;
  qerberosSignature: string;
  processingSteps: ProcessingStepResult[];
  duration: number;
  error?: string;
}

// Retrieval result for reverse flow
export interface RetrievalResult {
  success: boolean;
  data: any;
  contentId: string;
  auditCid: string;
  qerberosSignature: string;
  retrievalSteps: ProcessingStepResult[];
  duration: number;
  integrityVerified: boolean;
  error?: string;
}

// Integrity validation result
export interface IntegrityResult {
  isValid: boolean;
  contentId: string;
  auditCid: string;
  qerberosSignatureValid: boolean;
  dataIntegrityValid: boolean;
  pipelineIntegrityValid: boolean;
  errors: string[];
  validationTimestamp: Date;
}

// Flow metrics for monitoring
export interface FlowMetrics {
  totalProcessed: number;
  totalRetrieved: number;
  averageProcessingTime: number;
  averageRetrievalTime: number;
  successRate: number;
  errorRate: number;
  throughput: {
    processedPerSecond: number;
    retrievedPerSecond: number;
  };
  pipelineStepMetrics: Record<PipelineStep, StepMetrics>;
}

// Individual step metrics
export interface StepMetrics {
  totalExecutions: number;
  averageDuration: number;
  successRate: number;
  errorCount: number;
  lastExecution: Date;
}

// Pipeline steps enumeration
export enum PipelineStep {
  // Forward flow steps
  INPUT_VALIDATION = 'input_validation',
  QOMPRESS_COMPRESSION = 'qompress_compression',
  QLOCK_ENCRYPTION = 'qlock_encryption',
  QINDEX_METADATA = 'qindex_metadata',
  QERBEROS_SECURITY = 'qerberos_security',
  IPFS_STORAGE = 'ipfs_storage',
  
  // Reverse flow steps
  IPFS_RETRIEVAL = 'ipfs_retrieval',
  QINDEX_LOOKUP = 'qindex_lookup',
  QERBEROS_VERIFICATION = 'qerberos_verification',
  QLOCK_DECRYPTION = 'qlock_decryption',
  QOMPRESS_DECOMPRESSION = 'qompress_decompression',
  OUTPUT_VALIDATION = 'output_validation'
}

// Processing step result
export interface ProcessingStepResult {
  step: PipelineStep;
  success: boolean;
  duration: number;
  inputSize?: number;
  outputSize?: number;
  metadata?: Record<string, any>;
  error?: string;
  timestamp: Date;
}

// Step validation result
export interface StepValidationResult {
  step: PipelineStep;
  isValid: boolean;
  expectedOutput: any;
  actualOutput: any;
  validationErrors: string[];
  performance: {
    duration: number;
    throughput: number;
  };
}

// Data flow configuration
export interface QInfinityConfig {
  qompress: {
    algorithm: 'lz4' | 'gzip' | 'brotli';
    compressionLevel: number;
  };
  qlock: {
    encryptionAlgorithm: 'aes-256-gcm' | 'chacha20-poly1305';
    keyDerivation: 'pbkdf2' | 'scrypt';
  };
  qindex: {
    metadataFields: string[];
    indexingStrategy: 'immediate' | 'batch';
  };
  qerberos: {
    signatureAlgorithm: 'ed25519' | 'secp256k1';
    auditLevel: 'basic' | 'detailed';
  };
  ipfs: {
    gateway: string;
    timeout: number;
    pinning: boolean;
  };
}