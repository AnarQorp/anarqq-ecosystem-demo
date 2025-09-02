import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { DocumentationGeneratorService } from '../services/DocumentationGeneratorService.js';
import { 
  DocumentationConfig, 
  DocumentationTemplate, 
  Language 
} from '../types/index.js';

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

describe('DocumentationGeneratorService', () => {
  let service: DocumentationGeneratorService;
  let mockConfig: DocumentationConfig;
  let mockTemplate: DocumentationTemplate;

  beforeEach(() => {
    service = new DocumentationGeneratorService();
    
    mockConfig = {
      outputDirectory: '/test/output',
      templateDirectory: '/test/templates',
      languages: ['en', 'es'],
      defaultLanguage: 'en',
      validation: {
        enableSpellCheck: true,
        enableGrammarCheck: true,
        enableLinkValidation: true
      }
    };

    mockTemplate = {
      id: 'test-template',
      name: 'Test Template',
      type: 'setup',
      templatePath: '/test/templates/test.md',
      outputPath: 'test-output.md',
      variables: {
        version: '1.0.0',
        title: 'Test Document'
      },
      translations: {
        en: {
          greeting: 'Hello',
          farewell: 'Goodbye'
        },
        es: {
          greeting: 'Hola',
          farewell: 'Adiós'
        }
      }
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with valid configuration', async () => {
      const mockReaddir = vi.mocked(fs.readdir);
      const mockAccess = vi.mocked(fs.access);
      
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue(['template1.json', 'template2.json'] as any);

      await expect(service.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should create output directory if it does not exist', async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockReaddir = vi.mocked(fs.readdir);

      mockAccess.mockRejectedValueOnce(new Error('Directory not found'));
      mockMkdir.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([]);

      await service.initialize(mockConfig);

      expect(mockMkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
    });
  });

  describe('generateFromTemplate', () => {
    beforeEach(async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockReaddir = vi.mocked(fs.readdir);
      
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([]);
      
      await service.initialize(mockConfig);
    });

    it('should generate documentation with template variables', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const templateContent = '# {{title}}\nVersion: {{version}}\n{{t:greeting}} World!';
      
      mockReadFile.mockResolvedValue(templateContent);

      const result = await service.generateFromTemplate(mockTemplate, 'en', {});

      expect(result.content).toContain('# Test Document');
      expect(result.content).toContain('Version: 1.0.0');
      expect(result.content).toContain('Hello World!');
      expect(result.language).toBe('en');
      expect(result.templateId).toBe('test-template');
    });

    it('should generate documentation with dynamic data', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const templateContent = 'User: {{username}}\nEmail: {{email}}';
      
      mockReadFile.mockResolvedValue(templateContent);

      const dynamicData = {
        username: 'testuser',
        email: 'test@example.com'
      };

      const result = await service.generateFromTemplate(mockTemplate, 'en', dynamicData);

      expect(result.content).toContain('User: testuser');
      expect(result.content).toContain('Email: test@example.com');
    });

    it('should generate documentation with translations', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const templateContent = '{{t:greeting}} and {{t:farewell}}';
      
      mockReadFile.mockResolvedValue(templateContent);

      const resultEn = await service.generateFromTemplate(mockTemplate, 'en', {});
      const resultEs = await service.generateFromTemplate(mockTemplate, 'es', {});

      expect(resultEn.content).toBe('Hello and Goodbye');
      expect(resultEs.content).toBe('Hola and Adiós');
    });

    it('should calculate word count correctly', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const templateContent = 'This is a test document with exactly ten words here.';
      
      mockReadFile.mockResolvedValue(templateContent);

      const result = await service.generateFromTemplate(mockTemplate, 'en', {});

      expect(result.wordCount).toBe(10);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new DocumentationGeneratorService();

      await expect(
        uninitializedService.generateFromTemplate(mockTemplate, 'en', {})
      ).rejects.toThrow('DocumentationGenerator not initialized');
    });
  });

  describe('generateBilingual', () => {
    beforeEach(async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockReaddir = vi.mocked(fs.readdir);
      
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([]);
      
      await service.initialize(mockConfig);
    });

    it('should generate documentation for all configured languages', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const templateContent = '{{t:greeting}} World!';
      
      mockReadFile.mockResolvedValue(templateContent);

      const results = await service.generateBilingual(mockTemplate, {});

      expect(results).toHaveProperty('en');
      expect(results).toHaveProperty('es');
      expect(results.en.content).toBe('Hello World!');
      expect(results.es.content).toBe('Hola World!');
    });
  });

  describe('validateContent', () => {
    beforeEach(async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockReaddir = vi.mocked(fs.readdir);
      
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([]);
      
      await service.initialize(mockConfig);
    });

    it('should validate content structure', async () => {
      const validContent = '# Title\n\nThis is a well-structured document with headers and content.';
      
      const result = await service.validateContent(validContent, 'en');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metrics.completenessScore).toBeGreaterThan(0);
    });

    it('should detect empty content', async () => {
      const emptyContent = '';
      
      const result = await service.validateContent(emptyContent, 'en');

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'structure',
            message: 'Document content is empty',
            severity: 'error'
          })
        ])
      );
    });

    it('should detect missing headers', async () => {
      const contentWithoutHeaders = 'This is content without any headers.';
      
      const result = await service.validateContent(contentWithoutHeaders, 'en');

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'structure',
            message: 'Document appears to be missing headers'
          })
        ])
      );
    });

    it('should detect short content', async () => {
      const shortContent = 'Short.';
      
      const result = await service.validateContent(shortContent, 'en');

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'completeness',
            message: 'Document content appears to be very short'
          })
        ])
      );
    });

    it('should detect common misspellings', async () => {
      const contentWithMisspellings = 'This is teh content with definately some errors.';
      
      const result = await service.validateContent(contentWithMisspellings, 'en');

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'spelling',
            message: expect.stringContaining('teh')
          }),
          expect.objectContaining({
            type: 'spelling',
            message: expect.stringContaining('definately')
          })
        ])
      );
    });

    it('should detect grammar issues', async () => {
      const contentWithGrammarIssues = 'This  has  double  spaces';
      
      const result = await service.validateContent(contentWithGrammarIssues, 'en');

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'grammar',
            message: 'Multiple consecutive spaces found'
          })
        ])
      );
    });

    it('should calculate readability score', async () => {
      const readableContent = 'This is a short sentence. This is another short sentence.';
      
      const result = await service.validateContent(readableContent, 'en');

      expect(result.metrics.readabilityScore).toBeGreaterThan(80);
    });

    it('should calculate completeness score', async () => {
      const completeContent = `
        # Title
        
        This is a complete document with:
        - Headers
        - Lists
        - [Links](http://example.com)
        
        \`\`\`
        Code examples
        \`\`\`
        
        And sufficient content to demonstrate completeness. This document has enough content to meet the length requirements for a good completeness score.
      `;
      
      const result = await service.validateContent(completeContent, 'en');

      expect(result.metrics.completenessScore).toBeGreaterThanOrEqual(70);
    });
  });

  describe('saveDocumentation', () => {
    beforeEach(async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockReaddir = vi.mocked(fs.readdir);
      
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([]);
      
      await service.initialize(mockConfig);
    });

    it('should save documentation with language suffix', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockAccess = vi.mocked(fs.access);
      
      mockAccess.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const content = 'Test content';
      const outputPath = '/test/output/document.md';

      await service.saveDocumentation(content, outputPath, 'es');

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/output/document-es.md',
        content,
        'utf-8'
      );
    });

    it('should create output directory if it does not exist', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      
      mockAccess.mockRejectedValueOnce(new Error('Directory not found'));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const content = 'Test content';
      const outputPath = '/test/new-dir/document.md';

      await service.saveDocumentation(content, outputPath, 'en');

      expect(mockMkdir).toHaveBeenCalledWith('/test/new-dir', { recursive: true });
    });
  });

  describe('loadTemplate', () => {
    it('should load template from file', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const templateData = JSON.stringify(mockTemplate);
      
      mockReadFile.mockResolvedValue(templateData);

      const result = await service.loadTemplate('/test/template.json');

      expect(result).toEqual(mockTemplate);
      expect(mockReadFile).toHaveBeenCalledWith('/test/template.json', 'utf-8');
    });

    it('should cache loaded templates', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const templateData = JSON.stringify(mockTemplate);
      
      mockReadFile.mockResolvedValue(templateData);

      // Load template twice
      await service.loadTemplate('/test/template.json');
      await service.loadTemplate('/test/template.json');

      // File should only be read once due to caching
      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid template file', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(
        service.loadTemplate('/test/invalid.json')
      ).rejects.toThrow('Failed to load template from /test/invalid.json');
    });

    it('should throw error for invalid JSON', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      
      mockReadFile.mockResolvedValue('invalid json content');

      await expect(
        service.loadTemplate('/test/invalid.json')
      ).rejects.toThrow('Failed to load template from /test/invalid.json');
    });
  });

  describe('getAvailableTemplates', () => {
    beforeEach(async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockReaddir = vi.mocked(fs.readdir);
      const mockReadFile = vi.mocked(fs.readFile);
      
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue(['template1.json', 'template2.json', 'readme.txt'] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockTemplate));
      
      await service.initialize(mockConfig);
    });

    it('should return list of available templates', async () => {
      const templates = await service.getAvailableTemplates();

      expect(templates).toHaveLength(2);
      expect(templates).toContain('/test/templates/template1.json');
      expect(templates).toContain('/test/templates/template2.json');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full documentation generation workflow', async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockReaddir = vi.mocked(fs.readdir);
      const mockReadFile = vi.mocked(fs.readFile);
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      // Setup mocks
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([]);
      mockReadFile.mockResolvedValue('# {{t:greeting}} {{username}}!\n\nWelcome to {{title}}.');
      mockWriteFile.mockResolvedValue(undefined);

      // Initialize service
      await service.initialize(mockConfig);

      // Generate bilingual documentation
      const results = await service.generateBilingual(mockTemplate, { username: 'TestUser' });

      // Validate results
      expect(results.en.content).toBe('# Hello TestUser!\n\nWelcome to Test Document.');
      expect(results.es.content).toBe('# Hola TestUser!\n\nWelcome to Test Document.');

      // Save documentation
      await service.saveDocumentation(results.en.content, results.en.outputPath, 'en');
      await service.saveDocumentation(results.es.content, results.es.outputPath, 'es');

      // Verify saves
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });
  });
});