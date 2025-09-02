import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { 
  IDocumentationGenerator,
  DocumentationConfig,
  DocumentationResult,
  DocumentationTemplate,
  DocumentationValidationResult,
  Language,
  ValidationError,
  ValidationWarning
} from '../interfaces/index.js';

/**
 * Bilingual documentation generation service
 * Implements automated generation of English and Spanish documentation
 */
export class DocumentationGeneratorService implements IDocumentationGenerator {
  private config: DocumentationConfig | null = null;
  private templates: Map<string, DocumentationTemplate> = new Map();

  /**
   * Initialize the documentation generator with configuration
   */
  async initialize(config: DocumentationConfig): Promise<void> {
    this.config = config;
    
    // Ensure output directories exist
    await this.ensureDirectoryExists(config.outputDirectory);
    
    // Load available templates
    await this.loadAvailableTemplates();
  }

  /**
   * Generate documentation from template with dynamic content
   */
  async generateFromTemplate(
    template: DocumentationTemplate, 
    language: Language, 
    data: Record<string, any>
  ): Promise<DocumentationResult> {
    if (!this.config) {
      throw new Error('DocumentationGenerator not initialized');
    }

    // Load template content
    const templateContent = await this.loadTemplateContent(template.templatePath);
    
    // Process template with data and translations
    const processedContent = await this.processTemplate(templateContent, template, language, data);
    
    // Generate output path
    const outputPath = this.generateOutputPath(template, language);
    
    // Create result
    const result: DocumentationResult = {
      templateId: template.id,
      language,
      content: processedContent,
      outputPath,
      generatedAt: new Date(),
      wordCount: this.countWords(processedContent)
    };

    // Validate content if validation is enabled
    if (this.config.validation.enableSpellCheck || 
        this.config.validation.enableGrammarCheck || 
        this.config.validation.enableLinkValidation) {
      result.validationResult = await this.validateContent(processedContent, language);
    }

    return result;
  }

  /**
   * Generate bilingual documentation for both English and Spanish
   */
  async generateBilingual(
    template: DocumentationTemplate, 
    data: Record<string, any>
  ): Promise<Record<Language, DocumentationResult>> {
    if (!this.config) {
      throw new Error('DocumentationGenerator not initialized');
    }

    const results: Record<Language, DocumentationResult> = {} as Record<Language, DocumentationResult>;
    
    for (const language of this.config.languages) {
      results[language] = await this.generateFromTemplate(template, language, data);
    }

    return results;
  }

  /**
   * Validate generated documentation content
   */
  async validateContent(content: string, language: Language): Promise<DocumentationValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation checks
    await this.validateStructure(content, errors, warnings);
    
    if (this.config?.validation.enableLinkValidation) {
      await this.validateLinks(content, errors, warnings);
    }

    if (this.config?.validation.enableSpellCheck) {
      await this.validateSpelling(content, language, errors, warnings);
    }

    if (this.config?.validation.enableGrammarCheck) {
      await this.validateGrammar(content, language, errors, warnings);
    }

    // Calculate metrics
    const metrics = {
      readabilityScore: this.calculateReadabilityScore(content),
      completenessScore: this.calculateCompletenessScore(content),
      accuracyScore: errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 10))
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metrics
    };
  }

  /**
   * Load documentation template from file or configuration
   */
  async loadTemplate(templatePath: string): Promise<DocumentationTemplate> {
    const cachedTemplate = this.templates.get(templatePath);
    if (cachedTemplate) {
      return cachedTemplate;
    }

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = JSON.parse(templateContent) as DocumentationTemplate;
      this.templates.set(templatePath, template);
      return template;
    } catch (error) {
      throw new Error(`Failed to load template from ${templatePath}: ${error}`);
    }
  }

  /**
   * Save generated documentation to specified output path
   */
  async saveDocumentation(content: string, outputPath: string, language: Language): Promise<void> {
    // Ensure output directory exists
    await this.ensureDirectoryExists(dirname(outputPath));
    
    // Add language suffix to filename if not already present
    const finalOutputPath = this.addLanguageSuffix(outputPath, language);
    
    // Write content to file
    await fs.writeFile(finalOutputPath, content, 'utf-8');
  }

  /**
   * Get available documentation templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    return Array.from(this.templates.keys());
  }

  /**
   * Load available templates from template directory
   */
  private async loadAvailableTemplates(): Promise<void> {
    if (!this.config) return;

    try {
      const templateDir = this.config.templateDirectory;
      const files = await fs.readdir(templateDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = join(templateDir, file);
          try {
            await this.loadTemplate(templatePath);
          } catch (error) {
            console.warn(`Failed to load template ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load templates directory:', error);
    }
  }

  /**
   * Load template content from file
   */
  private async loadTemplateContent(templatePath: string): Promise<string> {
    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load template content from ${templatePath}: ${error}`);
    }
  }

  /**
   * Process template with data and translations
   */
  private async processTemplate(
    templateContent: string, 
    template: DocumentationTemplate, 
    language: Language, 
    data: Record<string, any>
  ): Promise<string> {
    let processedContent = templateContent;

    // Replace template variables
    for (const [key, value] of Object.entries(template.variables)) {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Replace dynamic data
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Replace translations
    const translations = template.translations[language] || {};
    for (const [key, value] of Object.entries(translations)) {
      const placeholder = `{{t:${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    }

    return processedContent;
  }

  /**
   * Generate output path for template and language
   */
  private generateOutputPath(template: DocumentationTemplate, language: Language): string {
    if (!this.config) {
      throw new Error('DocumentationGenerator not initialized');
    }

    const basePath = join(this.config.outputDirectory, template.outputPath);
    return this.addLanguageSuffix(basePath, language);
  }

  /**
   * Add language suffix to file path
   */
  private addLanguageSuffix(filePath: string, language: Language): string {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const basePath = filePath.substring(0, filePath.lastIndexOf('.'));
    
    // Don't add suffix if already present
    if (basePath.endsWith(`-${language}`) || basePath.endsWith(`_${language}`)) {
      return filePath;
    }
    
    return `${basePath}-${language}${ext}`;
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate document structure
   */
  private async validateStructure(
    content: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for basic markdown structure
    if (!content.includes('#')) {
      warnings.push({
        type: 'structure',
        message: 'Document appears to be missing headers',
        suggestion: 'Add appropriate headers to improve document structure'
      });
    }

    // Check for empty content
    if (content.trim().length === 0) {
      errors.push({
        type: 'structure',
        message: 'Document content is empty',
        severity: 'error'
      });
    }

    // Check for minimum content length
    if (content.trim().length < 100) {
      warnings.push({
        type: 'completeness',
        message: 'Document content appears to be very short',
        suggestion: 'Consider adding more detailed information'
      });
    }
  }

  /**
   * Validate links in content
   */
  private async validateLinks(
    content: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const linkUrl = match[2];
      
      // Basic URL validation
      if (!linkUrl.startsWith('http') && !linkUrl.startsWith('/') && !linkUrl.startsWith('#')) {
        warnings.push({
          type: 'link',
          message: `Potentially invalid link: ${linkUrl}`,
          suggestion: 'Verify that the link is correct and accessible'
        });
      }
    }
  }

  /**
   * Validate spelling (basic implementation)
   */
  private async validateSpelling(
    content: string, 
    language: Language, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Basic spell check implementation
    // In a real implementation, you would integrate with a spell checking library
    const commonMisspellings: Record<string, string> = {
      'teh': 'the',
      'recieve': 'receive',
      'seperate': 'separate',
      'definately': 'definitely'
    };

    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    
    for (const word of words) {
      if (commonMisspellings[word]) {
        warnings.push({
          type: 'spelling',
          message: `Possible misspelling: "${word}" should be "${commonMisspellings[word]}"`,
          suggestion: `Replace "${word}" with "${commonMisspellings[word]}"`
        });
      }
    }
  }

  /**
   * Validate grammar (basic implementation)
   */
  private async validateGrammar(
    content: string, 
    language: Language, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Basic grammar check implementation
    // In a real implementation, you would integrate with a grammar checking service
    
    // Check for double spaces
    if (content.includes('  ')) {
      warnings.push({
        type: 'grammar',
        message: 'Multiple consecutive spaces found',
        suggestion: 'Replace multiple spaces with single spaces'
      });
    }

    // Check for missing periods at end of sentences
    const sentences = content.split('\n').filter(line => line.trim().length > 0);
    for (const sentence of sentences) {
      if (sentence.trim().length > 10 && !sentence.trim().match(/[.!?]$/)) {
        warnings.push({
          type: 'grammar',
          message: 'Sentence may be missing punctuation',
          suggestion: 'Add appropriate punctuation at the end of sentences'
        });
      }
    }
  }

  /**
   * Calculate readability score (basic implementation)
   */
  private calculateReadabilityScore(content: string): number {
    const words = content.match(/\b\w+\b/g) || [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    
    // Simple readability score based on average sentence length
    // Lower scores indicate better readability
    if (avgWordsPerSentence <= 15) return 90;
    if (avgWordsPerSentence <= 20) return 80;
    if (avgWordsPerSentence <= 25) return 70;
    return 60;
  }

  /**
   * Calculate completeness score
   */
  private calculateCompletenessScore(content: string): number {
    let score = 0;
    
    // Check for headers
    if (content.includes('#')) score += 20;
    
    // Check for code examples
    if (content.includes('```')) score += 20;
    
    // Check for links
    if (content.includes('[') && content.includes('](')) score += 15;
    
    // Check for lists
    if (content.includes('- ') || content.includes('* ')) score += 15;
    
    // Check for minimum length
    if (content.length > 500) score += 15;
    if (content.length > 1000) score += 15;
    
    return Math.min(100, score);
  }
}