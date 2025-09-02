import { 
  DocumentationConfig,
  DocumentationResult,
  DocumentationTemplate,
  DocumentationValidationResult,
  Language
} from '../types/index.js';

/**
 * Interface for bilingual documentation generation system
 * Handles automated generation of English and Spanish documentation
 */
export interface IDocumentationGenerator {
  /**
   * Generate documentation from template with dynamic content
   * @param template - Documentation template configuration
   * @param language - Target language for generation
   * @param data - Dynamic data to insert into template
   * @returns Promise resolving to documentation generation result
   */
  generateFromTemplate(
    template: DocumentationTemplate, 
    language: Language, 
    data: Record<string, any>
  ): Promise<DocumentationResult>;

  /**
   * Generate bilingual documentation for both English and Spanish
   * @param template - Documentation template configuration
   * @param data - Dynamic data to insert into template
   * @returns Promise resolving to bilingual documentation results
   */
  generateBilingual(
    template: DocumentationTemplate, 
    data: Record<string, any>
  ): Promise<Record<Language, DocumentationResult>>;

  /**
   * Validate generated documentation content
   * @param content - Documentation content to validate
   * @param language - Language of the content
   * @returns Promise resolving to validation results
   */
  validateContent(content: string, language: Language): Promise<DocumentationValidationResult>;

  /**
   * Load documentation template from file or configuration
   * @param templatePath - Path to template file or template identifier
   * @returns Promise resolving to loaded template
   */
  loadTemplate(templatePath: string): Promise<DocumentationTemplate>;

  /**
   * Save generated documentation to specified output path
   * @param content - Documentation content to save
   * @param outputPath - Target file path for saving
   * @param language - Language of the content
   * @returns Promise resolving when save is complete
   */
  saveDocumentation(content: string, outputPath: string, language: Language): Promise<void>;

  /**
   * Get available documentation templates
   * @returns Promise resolving to list of available templates
   */
  getAvailableTemplates(): Promise<string[]>;

  /**
   * Initialize the documentation generator with configuration
   * @param config - Documentation generation configuration
   * @returns Promise resolving when initialization is complete
   */
  initialize(config: DocumentationConfig): Promise<void>;
}