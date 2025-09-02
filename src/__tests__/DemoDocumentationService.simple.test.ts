import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DemoDocumentationService } from '../services/DemoDocumentationService.js';

// Mock the DocumentationGeneratorService
const mockDocGenerator = {
  initialize: vi.fn(),
  generateBilingual: vi.fn(),
  loadTemplate: vi.fn(),
  saveDocumentation: vi.fn(),
  getAvailableTemplates: vi.fn(),
  generateFromTemplate: vi.fn()
};

vi.mock('../services/DocumentationGeneratorService.js', () => ({
  DocumentationGeneratorService: vi.fn(() => mockDocGenerator)
}));

describe('DemoDocumentationService', () => {
  let service: DemoDocumentationService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockDocGenerator.initialize.mockResolvedValue(undefined);
    mockDocGenerator.loadTemplate.mockResolvedValue({
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
    mockDocGenerator.generateBilingual.mockResolvedValue({
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
    mockDocGenerator.saveDocumentation.mockResolvedValue(undefined);
    
    service = new DemoDocumentationService();
  });

  describe('initialize', () => {
    it('should initialize the documentation generator with correct config', async () => {
      await service.initialize();

      expect(mockDocGenerator.initialize).toHaveBeenCalledWith(
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

    it('should generate setup guide successfully', async () => {
      const results = await service.generateSetupGuide();

      expect(mockDocGenerator.loadTemplate).toHaveBeenCalled();
      expect(mockDocGenerator.generateBilingual).toHaveBeenCalled();
      expect(mockDocGenerator.saveDocumentation).toHaveBeenCalledTimes(2);
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should include required dynamic data', async () => {
      await service.generateSetupGuide();

      const [, dynamicData] = mockDocGenerator.generateBilingual.mock.calls[0];
      
      expect(dynamicData).toMatchObject({
        demoVersion: '1.0.0',
        supportedPlatforms: expect.any(String),
        minMemory: '8GB',
        recommendedMemory: '16GB'
      });
    });
  });

  describe('generateWorkflowGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate workflow guide successfully', async () => {
      const results = await service.generateWorkflowGuide();

      expect(mockDocGenerator.loadTemplate).toHaveBeenCalled();
      expect(mockDocGenerator.generateBilingual).toHaveBeenCalled();
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should include performance metrics', async () => {
      await service.generateWorkflowGuide();

      const [, dynamicData] = mockDocGenerator.generateBilingual.mock.calls[0];
      
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

    it('should generate API reference successfully', async () => {
      const results = await service.generateApiReference();

      expect(mockDocGenerator.generateBilingual).toHaveBeenCalled();
      expect(mockDocGenerator.saveDocumentation).toHaveBeenCalled();
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });
  });

  describe('generateTroubleshootingGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate troubleshooting guide successfully', async () => {
      const results = await service.generateTroubleshootingGuide();

      expect(mockDocGenerator.generateBilingual).toHaveBeenCalled();
      expect(mockDocGenerator.saveDocumentation).toHaveBeenCalled();
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
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
    });
  });

  describe('Template Content Generation', () => {
    it('should generate valid API reference template content', async () => {
      await service.initialize();
      
      // Test the private method by calling generateApiReference
      await service.generateApiReference();
      
      // Verify that saveDocumentation was called with template content
      const saveCall = mockDocGenerator.saveDocumentation.mock.calls.find(
        call => call[1].includes('api-reference.md')
      );
      
      expect(saveCall).toBeDefined();
      expect(saveCall[0]).toContain('# {{t:title}}');
    });

    it('should generate valid troubleshooting template content', async () => {
      await service.initialize();
      
      // Test the private method by calling generateTroubleshootingGuide
      await service.generateTroubleshootingGuide();
      
      // Verify that saveDocumentation was called with template content
      const saveCall = mockDocGenerator.saveDocumentation.mock.calls.find(
        call => call[1].includes('troubleshooting-guide.md')
      );
      
      expect(saveCall).toBeDefined();
      expect(saveCall[0]).toContain('# {{t:title}}');
    });
  });
});