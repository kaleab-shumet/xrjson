import { LiteralsMap, XrjsonError, XrjsonParseResult } from './types';

export function parseXrjsonContent(content: string): XrjsonParseResult {
  // Use regex to find the literals block, but be more careful about boundaries
  const literalsMatch = content.match(/^([\s\S]*?)\s*(<literals>[\s\S]*<\/literals>)\s*$/);
  
  if (!literalsMatch) {
    throw new XrjsonError('No <literals> block found in xrjson content');
  }
  
  const jsonContent = literalsMatch[1].trim();
  const xmlContent = literalsMatch[2];
  
  if (!jsonContent) {
    throw new XrjsonError('No JSON content found in xrjson file');
  }
  
  // Validate that we have exactly one literals block
  const literalsCount = (xmlContent.match(/<literals>/g) || []).length;
  const literalsEndCount = (xmlContent.match(/<\/literals>/g) || []).length;
  
  if (literalsCount !== 1 || literalsEndCount !== 1) {
    throw new XrjsonError('Invalid literals block structure - content may contain conflicting XML patterns, or multiple <literals> tags');
  }
  
  return {
    jsonContent,
    xmlContent
  };
}


// No HTML entity processing - all content is treated as raw text

export function parseLiteralsXml(literalsXml: string): LiteralsMap {
  const literalsMap: LiteralsMap = {};
  
  // Validate that we have a proper <literals> wrapper
  if (!/<literals[\s>]/.test(literalsXml) || !/<\/literals>/.test(literalsXml)) {
    throw new XrjsonError('Invalid XML: missing <literals> root element');
  }
  
  // Extract all literal elements using regex
  const literalRegex = /<literal\s+([^>]*?)>([\s\S]*?)<\/literal>/gi;
  let match;
  
  while ((match = literalRegex.exec(literalsXml)) !== null) {
    const attributes = match[1];
    let content = match[2];
    
    // Extract id attribute from the attributes string
    const idMatch = attributes.match(/id\s*=\s*["']([^"']+)["']/i);
    if (!idMatch) {
      throw new XrjsonError('Literal element missing required "id" attribute');
    }
    
    const id = idMatch[1];
    

    // Store content as-is (raw content)
    literalsMap[id] = content;
  }
  
  // Check if we found any literals
  if (Object.keys(literalsMap).length === 0) {
    // Check if there are any literal tags at all to provide better error messages
    if (/<literal\s/.test(literalsXml)) {
      throw new XrjsonError('Found <literal> elements but could not parse them properly');
    }
    // Return empty map for valid but empty literals block
  }
  
  return literalsMap;
}

const XRJSON_DOUBLE_QUOTE_PATTERN = /^xrjson\("([^"]+)"\)$/;
const XRJSON_SINGLE_QUOTE_PATTERN = /^xrjson\('([^']+)'\)$/;

export function isXrjsonStringReference(value: any): value is string {
  return typeof value === 'string' && 
    (XRJSON_DOUBLE_QUOTE_PATTERN.test(value) || XRJSON_SINGLE_QUOTE_PATTERN.test(value));
}

export function isXrjsonObjectReference(value: any): boolean {
  return typeof value === 'object' && 
    value !== null && 
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    'xrjson' in value &&
    typeof value.xrjson === 'string';
}

export function extractXrjsonId(reference: string | object): string {
  if (typeof reference === 'string') {
    let match = reference.match(XRJSON_DOUBLE_QUOTE_PATTERN);
    if (match) {
      return match[1];
    }
    
    match = reference.match(XRJSON_SINGLE_QUOTE_PATTERN);
    if (match) {
      return match[1];
    }
    
    throw new XrjsonError(`Invalid xrjson string reference format: ${reference}`);
  }
  
  if (isXrjsonObjectReference(reference)) {
    return (reference as any).xrjson;
  }
  
  throw new XrjsonError(`Invalid xrjson reference format: ${JSON.stringify(reference)}`);
}

function resolveStringReferences(str: string, literalsMap: LiteralsMap, visitedIds: Set<string>): string {
  const doubleQuoteRegex = /xrjson\("([^"]+)"\)/g;
  const singleQuoteRegex = /xrjson\('([^']+)'\)/g;
  
  const replaceReference = (match: string, id: string) => {
    if (visitedIds.has(id)) {
      throw new XrjsonError(`Circular reference detected for literal ID: ${id}`);
    }
    
    if (!(id in literalsMap)) {
      throw new XrjsonError(`Literal with ID "${id}" not found`);
    }
    
    visitedIds.add(id);
    const literalContent = literalsMap[id];
    const resolved = resolveReferences(literalContent, literalsMap, visitedIds) as string;
    visitedIds.delete(id);
    
    return resolved;
  };
  
  let result = str.replace(doubleQuoteRegex, replaceReference);
  result = result.replace(singleQuoteRegex, replaceReference);
  
  return result;
}

export function resolveReferences(obj: any, literalsMap: LiteralsMap, visitedIds: Set<string> = new Set()): any {
  if (obj === null) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    if (isXrjsonStringReference(obj)) {
      const id = extractXrjsonId(obj);
      
      if (visitedIds.has(id)) {
        throw new XrjsonError(`Circular reference detected for literal ID: ${id}`);
      }
      
      if (!(id in literalsMap)) {
        throw new XrjsonError(`Literal with ID "${id}" not found`);
      }
      
      visitedIds.add(id);
      const literalContent = literalsMap[id];
      const resolved = resolveReferences(literalContent, literalsMap, visitedIds);
      visitedIds.delete(id);
      
      return resolved;
    }
    
    if (typeof obj === 'string') {
      return resolveStringReferences(obj, literalsMap, visitedIds);
    }
    
    return obj;
  }

  if (isXrjsonObjectReference(obj)) {
    const id = extractXrjsonId(obj);
    
    if (visitedIds.has(id)) {
      throw new XrjsonError(`Circular reference detected for literal ID: ${id}`);
    }
    
    if (!(id in literalsMap)) {
      throw new XrjsonError(`Literal with ID "${id}" not found`);
    }
    
    visitedIds.add(id);
    const literalContent = literalsMap[id];
    const resolved = resolveReferences(literalContent, literalsMap, visitedIds);
    visitedIds.delete(id);
    
    return resolved;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveReferences(item, literalsMap, visitedIds));
  }

  const resolved: any = {};
  for (const [key, value] of Object.entries(obj)) {
    resolved[key] = resolveReferences(value, literalsMap, visitedIds);
  }
  return resolved;
}