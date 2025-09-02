import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PiDocumentationService } from '../services/PiDocumentationService.js';

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

describe('PiDocumentationService', () => {
  let service: PiDocumentationService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockDocGenerator.initialize.mockResolvedValue(undefined);
    mockDocGenerator.loadTemplate.mockResolvedValue({
      id: 'pi-integration-guide',
      name: 'Pi Integration Guide',
      type: 'integration',
      templatePath: '/test/pi-integration-guide.md',
      outputPath: 'integration-guide.md',
      variables: {},
      translations: {
        en: { title: 'Pi Network Integration Guide' },
        es: { title: 'Guía de Integración de Pi Network' }
      }
    });
    mockDocGenerator.generateBilingual.mockResolvedValue({
      en: {
        templateId: 'pi-integration-guide',
        language: 'en',
        content: 'Generated Pi integration guide in English',
        outputPath: 'integration-guide-en.md',
        generatedAt: new Date(),
        wordCount: 100
      },
      es: {
        templateId: 'pi-integration-guide',
        language: 'es',
        content: 'Generated Pi integration guide in Spanish',
        outputPath: 'integration-guide-es.md',
        generatedAt: new Date(),
        wordCount: 100
      }
    });
    mockDocGenerator.saveDocumentation.mockResolvedValue(undefined);
    mockDocGenerator.getAvailableTemplates.mockResolvedValue(['pi-integration-guide.json']);
    mockDocGenerator.generateFromTemplate.mockResolvedValue({
      templateId: 'pi-integration-guide',
      language: 'en',
      content: 'Generated content',
      outputPath: 'integration-guide.md',
      generatedAt: new Date(),
      wordCount: 100,
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
    
    service = new PiDocumentationService();
  });

  describe('initialize', () => {
    it('should initialize the documentation generator with Pi-specific config', async () => {
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

  describe('generatePiIntegrationGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate Pi integration guide successfully', async () => {
      const results = await service.generatePiIntegrationGuide();

      expect(mockDocGenerator.loadTemplate).toHaveBeenCalled();
      expect(mockDocGenerator.generateBilingual).toHaveBeenCalled();
      expect(mockDocGenerator.saveDocumentation).toHaveBeenCalledTimes(2);
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should include Pi Network specific dynamic data', async () => {
      await service.generatePiIntegrationGuide();

      const [, dynamicData] = mockDocGenerator.generateBilingual.mock.calls[0];
      
      expect(dynamicData).toMatchObject({
        piNetworkVersion: '2.0',
        piWalletVersion: '1.5.0',
        testnetUrl: 'https://api.minepi.com/v2',
        chainId: '314159',
        supportEmail: 'pi-support@anarq.org'
      });
    });
  });

  describe('generatePiWalletSetupGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate Pi wallet setup guide successfully', async () => {
      const results = await service.generatePiWalletSetupGuide();

      expect(mockDocGenerator.generateBilingual).toHaveBeenCalled();
      expect(mockDocGenerator.saveDocumentation).toHaveBeenCalled();
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should save wallet setup template content', async () => {
      await service.generatePiWalletSetupGuide();

      // Check that template content was saved
      const saveCall = mockDocGenerator.saveDocumentation.mock.calls.find(
        call => call[1].includes('pi-wallet-setup.md')
      );
      
      expect(saveCall).toBeDefined();
      expect(saveCall[0]).toContain('# {{t:title}}');
      expect(saveCall[0]).toContain('{{t:overview}}');
    });
  });

  describe('generatePiSmartContractsGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate Pi smart contracts guide successfully', async () => {
      const results = await service.generatePiSmartContractsGuide();

      expect(mockDocGenerator.generateBilingual).toHaveBeenCalled();
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should include smart contract specific data', async () => {
      await service.generatePiSmartContractsGuide();

      const [, dynamicData] = mockDocGenerator.generateBilingual.mock.calls[0];
      
      expect(dynamicData).toMatchObject({
        solidityVersion: '0.8.19',
        qflowVersion: '2.0.0',
        gasLimit: '500000',
        deploymentCost: '0.1 Pi'
      });
    });
  });

  describe('generatePiTroubleshootingGuide', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate Pi troubleshooting guide successfully', async () => {
      const results = await service.generatePiTroubleshootingGuide();

      expect(mockDocGenerator.generateBilingual).toHaveBeenCalled();
      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
    });

    it('should include support resources', async () => {
      await service.generatePiTroubleshootingGuide();

      const [, dynamicData] = mockDocGenerator.generateBilingual.mock.calls[0];
      
      expect(dynamicData).toMatchObject({
        supportEmail: 'pi-support@anarq.org',
        piSupportUrl: 'https://support.minepi.com',
        communityForum: 'https://community.anarq.org/pi'
      });
    });
  });

  describe('generateAllPiDocumentation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate all Pi documentation types', async () => {
      const results = await service.generateAllPiDocumentation();

      expect(results).toHaveProperty('integrationGuide');
      expect(results).toHaveProperty('walletSetupGuide');
      expect(results).toHaveProperty('smartContractsGuide');
      expect(results).toHaveProperty('troubleshootingGuide');

      // Verify each guide has both languages
      expect(results.integrationGuide).toHaveProperty('en');
      expect(results.integrationGuide).toHaveProperty('es');
    });
  });

  describe('validateAllPiDocumentation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should validate Pi documentation successfully', async () => {
      const validationResults = await service.validateAllPiDocumentation();

      expect(mockDocGenerator.getAvailableTemplates).toHaveBeenCalled();
      expect(mockDocGenerator.loadTemplate).toHaveBeenCalled();
      expect(mockDocGenerator.generateFromTemplate).toHaveBeenCalled();
      expect(validationResults).toBeTypeOf('object');
    });
  });

  describe('Template Content Generation', () => {
    it('should generate valid Pi wallet setup template', async () => {
      await service.initialize();
      
      // Test by calling generatePiWalletSetupGuide
      await service.generatePiWalletSetupGuide();
      
      // Verify template content was generated and saved
      const templateSaveCall = mockDocGenerator.saveDocumentation.mock.calls.find(
        call => call[1].includes('pi-wallet-setup.md')
      );
      
      expect(templateSaveCall).toBeDefined();
      expect(templateSaveCall[0]).toContain('# {{t:title}}');
      expect(templateSaveCall[0]).toContain('{{t:prerequisites}}');
      expect(templateSaveCall[0]).toContain('{{piWalletDownloadUrl}}');
    });

    it('should generate valid Pi smart contracts template', async () => {
      await service.initialize();
      
      await service.generatePiSmartContractsGuide();
      
      const templateSaveCall = mockDocGenerator.saveDocumentation.mock.calls.find(
        call => call[1].includes('pi-smart-contracts.md')
      );
      
      expect(templateSaveCall).toBeDefined();
      expect(templateSaveCall[0]).toContain('# {{t:title}}');
      expect(templateSaveCall[0]).toContain('{{solidityVersion}}');
      expect(templateSaveCall[0]).toContain('pragma solidity');
    });

    it('should generate valid Pi troubleshooting template', async () => {
      await service.initialize();
      
      await service.generatePiTroubleshootingGuide();
      
      const templateSaveCall = mockDocGenerator.saveDocumentation.mock.calls.find(
        call => call[1].includes('pi-troubleshooting.md')
      );
      
      expect(templateSaveCall).toBeDefined();
      expect(templateSaveCall[0]).toContain('# {{t:title}}');
      expect(templateSaveCall[0]).toContain('{{t:authentication_issues}}');
      expect(templateSaveCall[0]).toContain('{{supportEmail}}');
    });
  });
});