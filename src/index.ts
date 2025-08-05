import { parseLiteralsXml, resolveReferences, parseXrjsonContent } from './parser';
import { XrjsonError } from './types';

export function parseXrjson(contentOrJson: string, literalsXml?: string): any {
  try {
    let jsonText: string;
    let xmlText: string;
    
    if (literalsXml !== undefined) {
      // Separate format: parseXrjson(jsonText, xmlText)
      jsonText = contentOrJson;
      xmlText = literalsXml;
    } else {
      // Unified format or pure JSON
      if (contentOrJson.includes('<literals>')) {
        // Unified format with literals block
        const parsed = parseXrjsonContent(contentOrJson);
        jsonText = parsed.jsonContent;
        xmlText = parsed.xmlContent;
      } else {
        // Pure JSON without literals
        jsonText = contentOrJson;
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