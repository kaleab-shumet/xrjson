import { LiteralsMap, XrjsonError, XrjsonParseResult } from './types';

export function parseXrjsonContent(content: string): XrjsonParseResult {
  // First, find the literals block anywhere in the content
  const literalsBlockMatch = content.match(/<literals>[\s\S]*?<\/literals>/);
  
  if (!literalsBlockMatch) {
    throw new XrjsonError('No <literals> block found in xrjson content');
  }
  
  const xmlContent = literalsBlockMatch[0];
  const literalsStart = literalsBlockMatch.index!;
  
  // Extract everything before the literals block as potential JSON content
  const beforeLiterals = content.substring(0, literalsStart).trim();
  
  // Find JSON content by looking for the last complete JSON object/array before the literals
  let jsonContent = '';
  let jsonStart = -1;
  
  // Try to find JSON starting from different positions, working backwards
  for (let i = beforeLiterals.length - 1; i >= 0; i--) {
    const char = beforeLiterals[i];
    if (char === '}' || char === ']') {
      // Found potential end of JSON, now find the matching start
      let braceCount = 0;
      let bracketCount = 0;
      let inString = false;
      let escape = false;
      
      for (let j = i; j >= 0; j--) {
        const currentChar = beforeLiterals[j];
        
        if (escape) {
          escape = false;
          continue;
        }
        
        if (currentChar === '\\') {
          escape = true;
          continue;
        }
        
        if (currentChar === '"') {
          inString = !inString;
          continue;
        }
        
        if (inString) continue;
        
        if (currentChar === '}') braceCount++;
        if (currentChar === '{') braceCount--;
        if (currentChar === ']') bracketCount++;
        if (currentChar === '[') bracketCount--;
        
        if (braceCount === 0 && bracketCount === 0 && (currentChar === '{' || currentChar === '[')) {
          jsonStart = j;
          jsonContent = beforeLiterals.substring(j, i + 1).trim();
          break;
        }
      }
      
      if (jsonStart !== -1) {
        // Validate that this is actually valid JSON
        try {
          JSON.parse(jsonContent);
          break; // Found valid JSON
        } catch {
          // Not valid JSON, continue searching
          jsonContent = '';
          jsonStart = -1;
        }
      }
    }
  }
  
  // If we didn't find JSON with the brace matching approach, try a simpler approach
  if (!jsonContent) {
    // Look for JSON-like patterns
    const jsonPattern = /(\{[\s\S]*?\}|\[[\s\S]*?\])\s*$/;
    const jsonMatch = beforeLiterals.match(jsonPattern);
    
    if (jsonMatch) {
      const candidate = jsonMatch[1].trim();
      try {
        JSON.parse(candidate);
        jsonContent = candidate;
      } catch {
        // Still not valid JSON
      }
    }
  }
  
  if (!jsonContent) {
    throw new XrjsonError('No valid JSON content found before the <literals> block');
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