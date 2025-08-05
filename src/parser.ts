import { XMLParser } from 'fast-xml-parser';
import { LiteralsMap, XrjsonError, XrjsonParseResult } from './types';

export function parseXrjsonContent(content: string): XrjsonParseResult {
  const literalsMatch = content.match(/<literals>([\s\S]*?)<\/literals>/);
  
  if (!literalsMatch) {
    throw new XrjsonError('No <literals> block found in xrjson content');
  }
  
  const xmlContent = `<literals>${literalsMatch[1]}</literals>`;
  const jsonContent = content.replace(/<literals>[\s\S]*?<\/literals>/, '').trim();
  
  if (!jsonContent) {
    throw new XrjsonError('No JSON content found in xrjson file');
  }
  
  return {
    jsonContent,
    xmlContent
  };
}

function extractLiteralContent(literalsXml: string, id: string): string {
  // Use regex to extract the raw content between literal tags
  const literalRegex = new RegExp(`<literal\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/literal>`, 'i');
  const match = literalsXml.match(literalRegex);
  return match ? match[1] : '';
}

export function parseLiteralsXml(literalsXml: string): LiteralsMap {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    trimValues: false,
    preserveOrder: false
  });

  try {
    const parsed = parser.parse(literalsXml);
    
    if (!parsed.literals) {
      throw new XrjsonError('Invalid XML: missing <literals> root element');
    }

    const literals = parsed.literals.literal;
    const literalsMap: LiteralsMap = {};

    if (!literals) {
      return literalsMap;
    }

    const literalArray = Array.isArray(literals) ? literals : [literals];

    for (const literal of literalArray) {
      const id = literal['@_id'];
      if (!id) {
        throw new XrjsonError('Literal element missing required "id" attribute');
      }

      // For complex content (when XML parser creates nested objects), 
      // extract raw content from original XML
      let content = '';
      const keys = Object.keys(literal);
      const hasOnlyTextAndId = keys.length === 2 && keys.includes('#text') && keys.includes('@_id');
      const hasOnlyId = keys.length === 1 && keys.includes('@_id');
      
      if (hasOnlyTextAndId && typeof literal['#text'] === 'string') {
        // Simple text content only
        content = literal['#text'];
      } else if (typeof literal === 'string') {
        content = literal;
      } else if (hasOnlyId) {
        // Empty literal element
        content = '';
      } else {
        // Complex content (has nested XML elements) - extract from original XML
        content = extractLiteralContent(literalsXml, id);
      }
      
      literalsMap[id] = content;
    }

    return literalsMap;
  } catch (error) {
    if (error instanceof XrjsonError) {
      throw error;
    }
    throw new XrjsonError(`Failed to parse literals XML: ${error instanceof Error ? error.message : String(error)}`);
  }
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