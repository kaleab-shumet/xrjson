import { parseLiteralsXml, resolveReferences, parseXrjsonContent } from './parser';
import { XrjsonError } from './types';

function cleanCodeBlock(content: string): string {
  // Remove markdown code block wrappers like ```xrjson or ```json
  const codeBlockRegex = /^```(?:xrjson|json)?\s*\n([\s\S]*?)\n```$/;
  const match = content.trim().match(codeBlockRegex);
  return match ? match[1] : content;
}

export function parseXrjson(contentOrJson: string, literalsXml?: string): any {
  try {
    // Clean markdown code blocks first
    const cleanedContent = cleanCodeBlock(contentOrJson);
    
    let jsonText: string;
    let xmlText: string;
    
    if (literalsXml !== undefined) {
      // Separate format: parseXrjson(jsonText, xmlText)
      jsonText = cleanedContent;
      xmlText = literalsXml;
    } else {
      // Unified format or pure JSON
      if (cleanedContent.includes('<literals>')) {
        // Unified format with literals block
        const parsed = parseXrjsonContent(cleanedContent);
        jsonText = parsed.jsonContent;
        xmlText = parsed.xmlContent;
      } else {
        // Pure JSON without literals
        jsonText = cleanedContent;
        xmlText = '<literals></literals>'; // Empty literals block
      }
    }
    
    const jsonObj = JSON.parse(jsonText);
    const literalsMap = parseLiteralsXml(xmlText);
    const resolvedObj = resolveReferences(jsonObj, literalsMap);
    
    return resolvedObj;
  } catch (error) {
    if (error instanceof XrjsonError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new XrjsonError(`Invalid JSON: ${error.message}`);
    }
    throw new XrjsonError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export { XrjsonError } from './types';