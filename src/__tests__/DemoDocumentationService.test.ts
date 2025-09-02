import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { DemoDocumentationService } from '../services/DemoDocumentationService.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn()
  }
}));

// Create mock methods
const mockDocGeneratorMethods = {
  initialize: vi.fn(),
  generateBilingual: vi.fn(),
  loadTemplate: vi.fn(),
  saveDocumentation: vi.fn(),
  getAvailableTemplates: vi.fn(),
  generateFromTemplate: vi.fn()
};

// Mock DocumentationGeneratorService
vi.mock('../services/DocumentationGeneratorService.js', () => ({
  DocumentationGeneratorService: vi.fn().mockImplementation(() => mockDocGeneratorMethods)
}));

describe('DemoDocumentationService', () => {
  let service: DemoDocumentationService;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mocks
    const mockAccess = vi.mocked(fs.access);
    const mockReaddir = vi.mocked(fs.readdir);
    const mockReadFile = vi.mocked(fs.readFile);
    const mockWriteFile = vi.mocked(fs.writeFile);

    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([]);
    mockReadFile.mockResolvedValue('mock template content');
    mockWriteFile.mockResolvedValue(undefined);

    // Setup mock return values
    mockDocGeneratorMethods.initialize.mockResolvedValue(undefined);
    mockDocGeneratorMethods.loadTemplate.mockResolvedValue({
      id: 'test-template',
      name: 'Test Template',
      type: 'setup',
      templatePath: '/test/template.md',
      outputPath: 'test-output.md',
      variables: {},
      translations: {
        en: { greeting: 'Hello' },
        es: { greeting: 'Hola' }
      }
    });
    mockDocGeneratorMethods.generateBilingual.mockResolvedValue({
      en: {
        templateId: 'test-template',
        language: 'en',
        content: 'Generated English content',
        outputPath: 'test-output-en.md',
        generatedAt: new Date(),
        wordCount: 10
      },
      es: {
        templateId: 'test-template',
        language: 'es',
        content: 'Generated Spanish content',
        outputPath: 'test-output-es.md',
        generatedAt: new Date(),
        wordCount: 10
      }
    });
    mockDocGeneratorMethods.saveDocumentation.mockResolvedValue(undefined);
    mockDocGeneratorMethods.getAvailableTemplates.mockResolvedValue(['template1.json', 'template2.json']);
    mockDocGeneratorMethods.generateFromTemplate.mockResolvedValue({
      templateId: 'test-template',
      language: 'en',
      content: 'Generated content',
      outputPath: 'test-output.md',
      generatedAt: new Date(),
      wordCount: 10,
      validationResult: {
        isValid: true,
        errors: [],
        warnings: [],
        metrics: {
          readabilityScore: 85,
          completenessScore: 90,
          accuracyScore: 95
        }
      }
    });

    // Create service instance after mocks are set up
    service = new DemoDocumentationService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the documentation generator', async () => {
      await service.initialize();

      expect(mockDocGeneratorMethods.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          languages: ['en', 'es'],
          defaultLanguage: 'en',
          validation: {
            enableSpellCheck: true,
            enableGrammarCheck: true,
            enableLinkValidation: true
          }
        })
      );
    });
  });

  describe('generateSetupGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate setup guide in both languages', async () => {
      const results = await service.generateSetupGuide();

      expect(mockDocGeneratorMethods.loadTemplate).toHaveBeenCalledWith(
        expect.stringContaining('setup-guide.json')
      );
      expect(mockDocGeneratorMethods.generateBilingual).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          currentDate: expect.any(String),
          nodeVersion: expect.any(String),
          demoVersion: '1.0.0'
        })
      );
      expect(mockDocGeneratorMethods.saveDocumentation).toHaveBeenCalledTimes(2);
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should include dynamic data in setup guide', async () => {
      await service.generateSetupGuide();

      const generateCall = mockDocGeneratorMethods.generateBilingual.mock.calls[0];
      const dynamicData = generateCall[1];

      expect(dynamicData).toMatchObject({
        demoVersion: '1.0.0',
        supportedPlatforms: 'Linux, macOS, Windows (WSL2)',
        minMemory: '8GB',
        recommendedMemory: '16GB',
        diskSpace: '20GB',
        dockerVersion: '20.10+',
        nodeJsVersion: '18+'
      });
    });
  });

  describe('generateWorkflowGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate workflow guide in both languages', async () => {
      const results = await service.generateWorkflowGuide();

      expect(mockDocGeneratorMethods.loadTemplate).toHaveBeenCalledWith(
        expect.stringContaining('workflow-guide.json')
      );
      expect(mockDocGeneratorMethods.generateBilingual).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          currentDate: expect.any(String),
          coreModules: expect.stringContaining('sQuid'),
          scenarioCount: 4
        })
      );
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should include performance metrics in workflow guide', async () => {
      await service.generateWorkflowGuide();

      const generateCall = mockDocGenerator.generateBilingual.mock.calls[0];
      const dynamicData = generateCall[1];

      expect(dynamicData).toMatchObject({
        maxLatency: '2 seconds',
        minThroughput: '100 RPS',
        maxErrorRate: '1%',
        qnetMinNodes: 5
      });
    });
  });

  describe('generateApiReference', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate API reference in both languages', async () => {
      const results = await service.generateApiReference();

      expect(mockDocGenerator.generateBilingual).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'api-reference',
          type: 'api'
        }),
        expect.objectContaining({
          baseUrl: 'http://localhost:3000/api',
          authEndpoint: '/auth/login',
          scenarioEndpoint: '/scenarios'
        })
      );
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should save API template content', async () => {
      await service.generateApiReference();

      expect(mockDocGenerator.saveDocumentation).toHaveBeenCalledWith(
        expect.stringContaining('# {{t:title}}'),
        expect.stringContaining('api-reference.md'),
        'en'
      );
    });
  });

  describe('generateTroubleshootingGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate troubleshooting guide in both languages', async () => {
      const results = await service.generateTroubleshootingGuide();

      expect(mockDocGenerator.generateBilingual).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'troubleshooting-guide',
          type: 'troubleshooting'
        }),
        expect.objectContaining({
          supportEmail: 'support@anarq.org',
          communityForum: 'https://community.anarq.org',
          githubIssues: expect.stringContaining('github.com')
        })
      );
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should save troubleshooting template content', async () => {
      await service.generateTroubleshootingGuide();

      expect(mockDocGenerator.saveDocumentation).toHaveBeenCalledWith(
        expect.stringContaining('# {{t:title}}'),
        expect.stringContaining('troubleshooting-guide.md'),
        'en'
      );
    });
  });

  describe('generateAllDocumentation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate all documentation types', async () => {
      const results = await service.generateAllDocumentation();

      expect(results).toHaveProperty('setupGuide');
      expect(results).toHaveProperty('workflowGuide');
      expect(results).toHaveProperty('apiReference');
      expect(results).toHaveProperty('troubleshootingGuide');

      // Verify each guide has both languages
      expect(results.setupGuide).toHaveProperty('en');
      expect(results.setupGuide).toHaveProperty('es');
      expect(results.workflowGuide).toHaveProperty('en');
      expect(results.workflowGuide).toHaveProperty('es');
      expect(results.apiReference).toHaveProperty('en');
      expect(results.apiReference).toHaveProperty('es');
      expect(results.troubleshootingGuide).toHaveProperty('en');
      expect(results.troubleshootingGuide).toHaveProperty('es');
    });

    it('should call all generation methods', async () => {
      const setupSpy = vi.spyOn(service, 'generateSetupGuide');
      const workflowSpy = vi.spyOn(service, 'generateWorkflowGuide');
      const apiSpy = vi.spyOn(service, 'generateApiReference');
      const troubleshootingSpy = vi.spyOn(service, 'generateTroubleshootingGuide');

      // Mock the methods to return expected results
      setupSpy.mockResolvedValue({} as any);
      workflowSpy.mockResolvedValue({} as any);
      apiSpy.mockResolvedValue({} as any);
      troubleshootingSpy.mockResolvedValue({} as any);

      await service.generateAllDocumentation();

      expect(setupSpy).toHaveBeenCalled();
      expect(workflowSpy).toHaveBeenCalled();
      expect(apiSpy).toHaveBeenCalled();
      expect(troubleshootingSpy).toHaveBeenCalled();
    });
  });

  describe('validateAllDocumentation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should validate all generated documentation', async () => {
      const validationResults = await service.validateAllDocumentation();

      expect(mockDocGenerator.getAvailableTemplates).toHaveBeenCalled();
      expect(mockDocGenerator.loadTemplate).toHaveBeenCalled();
      expect(mockDocGenerator.generateFromTemplate).toHaveBeenCalled();
      expect(validationResults).toBeTypeOf('object');
    });

    it('should return validation results for each template and language', async () => {
      const validationResults = await service.validateAllDocumentation();

      // Should have validation results for each template-language combination
      expect(Object.keys(validationResults).length).toBeGreaterThan(0);
      
      // Each result should contain validation metrics
      const firstResult = Object.values(validationResults)[0] as any;
      expect(firstResult).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
        metrics: expect.objectContaining({
          readabilityScore: expect.any(Number),
          completenessScore: expect.any(Number),
          accuracyScore: expect.any(Number)
        })
      });
    });
  });

  describe('Template Content Generation', () => {
    it('should generate valid API reference template', async () => {
      await service.initialize();
      
      // Access private method for testing
      const apiTemplate = (service as any).generateApiReferenceTemplate();

      expect(apiTemplate).toContain('# {{t:title}}');
      expect(apiTemplate).toContain('{{baseUrl}}');
      expect(apiTemplate).toContain('{{authEndpoint}}');
      expect(apiTemplate).toContain('{{scenarioEndpoint}}');
      expect(apiTemplate).toContain('POST {{scenarioEndpoint}}/identity');
      expect(apiTemplate).toContain('Authorization: Bearer {token}');
    });

    it('should generate valid troubleshooting template', async () => {
      await service.initialize();
      
      // Access private method for testing
      const troubleshootingTemplate = (service as any).generateTroubleshootingTemplate();

      expect(troubleshootingTemplate).toContain('# {{t:title}}');
      expect(troubleshootingTemplate).toContain('{{t:common_issues}}');
      expect(troubleshootingTemplate).toContain('{{t:performance_issues}}');
      expect(troubleshootingTemplate).toContain('{{supportEmail}}');
      expect(troubleshootingTemplate).toContain('docker-compose logs');
      expect(troubleshootingTemplate).toContain('npm run');
    });
  });

  describe('Error Handling', () => {
    it('should handle template loading errors gracefully', async () => {
      mockDocGenerator.loadTemplate.mockRejectedValue(new Error('Template not found'));

      await expect(service.generateSetupGuide()).rejects.toThrow('Template not found');
    });

    it('should handle generation errors gracefully', async () => {
      mockDocGenerator.generateBilingual.mockRejectedValue(new Error('Generation failed'));

      await expect(service.generateWorkflowGuide()).rejects.toThrow('Generation failed');
    });

    it('should handle save errors gracefully', async () => {
      mockDocGenerator.saveDocumentation.mockRejectedValue(new Error('Save failed'));

      await expect(service.generateApiReference()).rejects.toThrow('Save failed');
    });
  });
});